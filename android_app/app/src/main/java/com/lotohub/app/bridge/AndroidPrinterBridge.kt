package com.lotohub.app.bridge

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.widget.Toast
import com.google.gson.Gson
import com.lotohub.app.model.TicketData
import com.lotohub.app.printer.EscPosPrinter
import com.lotohub.app.utils.PrefsHelper
import java.util.concurrent.Executors

class AndroidPrinterBridge(private val context: Context) {

    private val executor = Executors.newSingleThreadExecutor()
    private val handler = Handler(Looper.getMainLooper())

    @JavascriptInterface
    fun printTicket(json: String): String {
        val macAddress = PrefsHelper.getPrinterMac(context)
        if (macAddress == null) {
            return "ERRO: Nenhuma impressora configurada no app."
        }

        val ticketData: TicketData
        try {
            ticketData = Gson().fromJson(json, TicketData::class.java)
        } catch (e: Exception) {
            e.printStackTrace()
            return "ERRO: JSON inválido - ${e.message}"
        }

        // Executa a impressão em uma thread de fundo para não travar o app
        executor.execute {
            val printer = EscPosPrinter(context, macAddress)
            val result = printer.print(ticketData)

            // Exibe o resultado na thread principal
            handler.post {
                Toast.makeText(context, result, Toast.LENGTH_LONG).show()
            }
        }

        return "OK"
    }

    @JavascriptInterface
    fun isReady(): Boolean {
        return PrefsHelper.getPrinterMac(context) != null
    }
}
