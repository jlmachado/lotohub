package com.lotohub.app

import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import com.lotohub.app.bridge.AndroidPrinterBridge

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    // IMPORTANTE: Troque esta URL pela URL do seu site
    private val siteUrl = "https://lotohub-premium.web.app/"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        setupWebView()

        webView.loadUrl(siteUrl)
    }

    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            // Permite conteúdo misto (HTTP em HTTPS), se necessário
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }
        // Adiciona a interface JavaScript para que o site possa chamar o código Kotlin
        webView.addJavascriptInterface(AndroidPrinterBridge(this), "AndroidPrinter")
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.main_menu, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_printer_settings -> {
                // Abre a tela de configuração da impressora
                val intent = Intent(this, PrinterSettingsActivity::class.java)
                startActivity(intent)
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    // Permite voltar na página do WebView ao pressionar o botão "Voltar" do dispositivo
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
