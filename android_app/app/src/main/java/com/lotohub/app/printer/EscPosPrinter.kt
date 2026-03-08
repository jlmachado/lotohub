package com.lotohub.app.printer

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import com.lotohub.app.model.TicketData
import com.lotohub.app.utils.PrefsHelper
import java.io.IOException
import java.io.OutputStream
import java.util.*

class EscPosPrinter(private val context: Context, private val macAddress: String) {

    // UUID padrão para comunicação com impressoras Bluetooth (SPP)
    private val sppUuid: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    // Comandos ESC/POS
    private val esc: Byte = 0x1B
    private val gs: Byte = 0x1D
    private val commandInitialize = byteArrayOf(esc, '@'.code.toByte())
    private val commandAlignLeft = byteArrayOf(esc, 'a'.code.toByte(), 0)
    private val commandAlignCenter = byteArrayOf(esc, 'a'.code.toByte(), 1)
    private val commandBoldOn = byteArrayOf(esc, 'E'.code.toByte(), 1)
    private val commandBoldOff = byteArrayOf(esc, 'E'.code.toByte(), 0)
    private val commandFeedLine = byteArrayOf(10) // LF

    fun print(ticket: TicketData): String {
        val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter() ?: return "ERRO: Bluetooth não suportado"
        val device = bluetoothAdapter.getRemoteDevice(macAddress)
        var socket: BluetoothSocket? = null

        try {
            // Verificação de permissão
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                return "ERRO: Permissão BLUETOOTH_CONNECT não concedida"
            }

            socket = device.createRfcommSocketToServiceRecord(sppUuid)
            socket.connect() // Esta é uma operação de bloqueio

            val outputStream = socket.outputStream
            val paperWidth = PrefsHelper.getPaperWidth(context)
            val lineLength = if (paperWidth == 80) 48 else 32

            // Monta o recibo
            outputStream.write(commandInitialize)

            // Cabeçalho
            setLineHeight(outputStream, 1.2f)
            setFontSize(outputStream, 12f)
            outputStream.write(commandAlignCenter)
            outputStream.write(commandBoldOn)
            outputStream.write(formatLine(ticket.banca ?: "BANCA", lineLength).toByteArray())
            outputStream.write(commandBoldOff)
            outputStream.write(commandFeedLine)

            outputStream.write(commandAlignCenter)
            outputStream.write("BILHETE DE LOTERIA\n".toByteArray())

            // Informações do Bilhete
            outputStream.write(commandAlignLeft)
            outputStream.write(("-".repeat(lineLength) + "\n").toByteArray())
            outputStream.write(("ID: " + (ticket.ticketId ?: "") + "\n").toByteArray())
            outputStream.write(("Data: " + (ticket.datetime ?: "") + "\n").toByteArray())
            outputStream.write(("-".repeat(lineLength) + "\n").toByteArray())

            // Apostas
            outputStream.write(commandBoldOn)
            outputStream.write(formatColumns("MODALIDADE", "VALOR", lineLength).toByteArray())
            outputStream.write(commandBoldOff)
            outputStream.write(commandFeedLine)

            ticket.apostas?.forEach { aposta ->
                val modNum = "${aposta.modalidade ?: ""} ${aposta.numero ?: ""}"
                val valor = "R$ ${aposta.valor ?: "0,00"}"
                outputStream.write(formatColumns(modNum, valor, lineLength).toByteArray())
                outputStream.write(commandFeedLine)
            }

            // Total
            outputStream.write(("-".repeat(lineLength) + "\n").toByteArray())
            outputStream.write(commandBoldOn)
            val totalText = "TOTAL: R$ ${ticket.total ?: "0,00"}"
            outputStream.write(formatLine(totalText, lineLength, alignRight = true).toByteArray())
            outputStream.write(commandBoldOff)
            outputStream.write(commandFeedLine)
            outputStream.write(commandFeedLine)

            // Rodapé
            outputStream.write(commandAlignCenter)
            outputStream.write("Boa sorte!\n".toByteArray())
            outputStream.write(commandFeedLine)
            outputStream.write(commandFeedLine)
            outputStream.write(commandFeedLine)
            
            outputStream.flush()
            return "Impressão enviada com sucesso"

        } catch (e: IOException) {
            e.printStackTrace()
            return "ERRO: Falha na conexão com a impressora - ${e.message}"
        } catch (e: SecurityException) {
            e.printStackTrace()
            return "ERRO: Permissão de Bluetooth negada - ${e.message}"
        } finally {
            try {
                socket?.close()
            } catch (e: IOException) {
                e.printStackTrace()
            }
        }
    }
    
    fun printTest(): String {
        // Usa a função de impressão principal com dados de teste
        val testTicket = TicketData(
            banca = "LotoHub App",
            ticketId = "TESTE-123",
            datetime = Date().toString(),
            apostas = listOf(com.lotohub.app.model.Aposta("TESTE", "0000", "0,00")),
            total = "0,00"
        )
        return print(testTicket)
    }

    private fun formatLine(text: String, lineLength: Int, alignRight: Boolean = false): String {
        return if (alignRight) {
            text.padStart(lineLength) + "\n"
        } else {
            text.padEnd(lineLength) + "\n"
        }
    }

    private fun formatColumns(col1: String, col2: String, lineLength: Int): String {
        val remainingSpace = lineLength - col1.length
        return col1 + col2.padStart(remainingSpace)
    }
    
    private fun setFontSize(outputStream: OutputStream, size: Float) {
        // ESC ! n - Seleciona modo de impressão
        // O valor 'n' é uma combinação de bits. Aqui, vamos focar no tamanho.
        // Valores aproximados: 0 para normal, 16 para altura dupla, 32 para largura dupla, 48 para ambos.
        val n = when {
            size >= 12f -> 48 // Grande
            size >= 11f -> 16 // Médio
            else -> 0          // Normal
        }
        outputStream.write(byteArrayOf(esc, '!'.code.toByte(), n.toByte()))
    }

    private fun setLineHeight(outputStream: OutputStream, height: Float) {
        // ESC 3 n - Ajusta espaçamento de linha
        // 'n' é em unidades de movimento vertical básico. 24 é um valor comum para padrão.
        val n = when {
            height > 1.18f -> 30
            height > 1.1f -> 26
            else -> 24
        }
        outputStream.write(byteArrayOf(esc, '3'.code.toByte(), n.toByte()))
    }
}
