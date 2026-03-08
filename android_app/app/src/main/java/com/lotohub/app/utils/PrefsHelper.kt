package com.lotohub.app.utils

import android.content.Context
import android.content.SharedPreferences

object PrefsHelper {
    private const val PREFS_NAME = "LotoHubPrefs"
    private const val KEY_PRINTER_MAC = "printer_mac"
    private const val KEY_PAPER_WIDTH = "paper_width_mm"
    private const val KEY_FONT_SIZE = "font_size"
    private const val KEY_LINE_HEIGHT = "line_height"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun savePrinterMac(context: Context, macAddress: String) {
        getPrefs(context).edit().putString(KEY_PRINTER_MAC, macAddress).apply()
    }

    fun getPrinterMac(context: Context): String? {
        return getPrefs(context).getString(KEY_PRINTER_MAC, null)
    }

    fun savePaperWidth(context: Context, width: Int) {
        getPrefs(context).edit().putInt(KEY_PAPER_WIDTH, width).apply()
    }

    fun getPaperWidth(context: Context): Int {
        return getPrefs(context).getInt(KEY_PAPER_WIDTH, 48) // Default 48mm
    }

    fun saveFontSize(context: Context, size: Float) {
        getPrefs(context).edit().putFloat(KEY_FONT_SIZE, size).apply()
    }

    fun getFontSize(context: Context): Float {
        return getPrefs(context).getFloat(KEY_FONT_SIZE, 10f) // Default 10
    }

     fun saveLineHeight(context: Context, height: Float) {
        getPrefs(context).edit().putFloat(KEY_LINE_HEIGHT, height).apply()
    }

    fun getLineHeight(context: Context): Float {
        return getPrefs(context).getFloat(KEY_LINE_HEIGHT, 1.15f) // Default 1.15
    }
}
