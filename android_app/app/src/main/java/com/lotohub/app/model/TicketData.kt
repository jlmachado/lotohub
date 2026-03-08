package com.lotohub.app.model

import com.google.gson.annotations.SerializedName

data class TicketData(
    @SerializedName("banca") val banca: String?,
    @SerializedName("ticketId") val ticketId: String?,
    @SerializedName("datetime") val datetime: String?,
    @SerializedName("apostas") val apostas: List<Aposta>?,
    @SerializedName("total") val total: String?
)

data class Aposta(
    @SerializedName("modalidade") val modalidade: String?,
    @SerializedName("numero") val numero: String?,
    @SerializedName("valor") val valor: String?
)
