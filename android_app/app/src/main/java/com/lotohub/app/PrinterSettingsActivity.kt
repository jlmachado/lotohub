package com.lotohub.app

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.RadioButton
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import com.lotohub.app.databinding.ActivityPrinterSettingsBinding
import com.lotohub.app.printer.EscPosPrinter
import com.lotohub.app.utils.PrefsHelper

class PrinterSettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivityPrinterSettingsBinding
    private val bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private var pairedDevices = mutableListOf<BluetoothDevice>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPrinterSettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        loadPairedDevices()
        loadCurrentSettings()
        setupClickListeners()
    }

    private fun setupClickListeners() {
        binding.btnSave.setOnClickListener {
            saveSettings()
            Toast.makeText(this, "Configurações salvas!", Toast.LENGTH_SHORT).show()
            finish()
        }
        binding.btnTestPrint.setOnClickListener {
            testPrint()
        }
    }

    private fun loadPairedDevices() {
        if (bluetoothAdapter == null) {
            Toast.makeText(this, "Bluetooth não suportado neste dispositivo", Toast.LENGTH_LONG).show()
            return
        }

        // Checagem de permissão para Android 12+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                 ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.BLUETOOTH_CONNECT), 101)
                // A lógica de carregar dispositivos será chamada de novo no onRequestPermissionsResult se a permissão for concedida
                return
            }
        }
        
        pairedDevices = bluetoothAdapter.bondedDevices.toMutableList()
        val deviceNames = pairedDevices.map { it.name }
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, deviceNames)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.spinnerPrinters.adapter = adapter

        val savedMac = PrefsHelper.getPrinterMac(this)
        if (savedMac != null) {
            val savedDeviceIndex = pairedDevices.indexOfFirst { it.address == savedMac }
            if (savedDeviceIndex != -1) {
                binding.spinnerPrinters.setSelection(savedDeviceIndex)
            }
        }
    }

    private fun loadCurrentSettings() {
        val paperWidth = PrefsHelper.getPaperWidth(this)
        when (paperWidth) {
            48 -> binding.radioGroupWidth.check(R.id.radio48mm)
            58 -> binding.radioGroupWidth.check(R.id.radio58mm)
            80 -> binding.radioGroupWidth.check(R.id.radio80mm)
        }

        val fontSize = PrefsHelper.getFontSize(this)
        binding.spinnerFontSize.setSelection(
            (binding.spinnerFontSize.adapter as ArrayAdapter<String>).getPosition(fontSize.toString())
        )

        val lineHeight = PrefsHelper.getLineHeight(this)
        binding.spinnerLineHeight.setSelection(
             (binding.spinnerLineHeight.adapter as ArrayAdapter<String>).getPosition(lineHeight.toString())
        )
    }

    private fun saveSettings() {
        if (pairedDevices.isEmpty()) return

        val selectedDeviceIndex = binding.spinnerPrinters.selectedItemPosition
        val selectedDevice = pairedDevices[selectedDeviceIndex]
        PrefsHelper.savePrinterMac(this, selectedDevice.address)

        val selectedRadioId = binding.radioGroupWidth.checkedRadioButtonId
        val radioButton = findViewById<RadioButton>(selectedRadioId)
        val paperWidth = when(radioButton.text.toString()) {
            "58mm" -> 58
            "80mm" -> 80
            else -> 48
        }
        PrefsHelper.savePaperWidth(this, paperWidth)

        val fontSize = binding.spinnerFontSize.selectedItem.toString().toFloat()
        PrefsHelper.saveFontSize(this, fontSize)

        val lineHeight = binding.spinnerLineHeight.selectedItem.toString().toFloat()
        PrefsHelper.saveLineHeight(this, lineHeight)
    }

    private fun testPrint() {
        val macAddress = PrefsHelper.getPrinterMac(this)
        if (macAddress == null) {
            Toast.makeText(this, "Nenhuma impressora selecionada", Toast.LENGTH_SHORT).show()
            return
        }

        val printer = EscPosPrinter(this, macAddress)

        Thread {
            val result = printer.printTest()
            runOnUiThread {
                Toast.makeText(this, result, Toast.LENGTH_LONG).show()
            }
        }.start()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 101 && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            // Se a permissão foi concedida, tente carregar os dispositivos novamente
            loadPairedDevices()
        } else {
             Toast.makeText(this, "Permissão de Bluetooth é necessária para listar impressoras", Toast.LENGTH_LONG).show()
        }
    }
     override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }
}
