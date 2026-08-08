package com.aboooooo57.lexume.data.model

/** Kotlin analog of macOS's `Models/TargetLanguage.swift`. */
data class TargetLanguage(val displayName: String, val code: String, val isRtl: Boolean) {
    companion object {
        /**
         * Persian stays first (the existing default). The rest cover most of
         * what Google Translate/Gemini actually support - the original list
         * of 10 was just an arbitrary carryover from the web app's scope,
         * not a technical limit.
         */
        val all: List<TargetLanguage> = listOf(
            TargetLanguage("Persian", "fa", isRtl = true),
            TargetLanguage("Spanish", "es", isRtl = false),
            TargetLanguage("French", "fr", isRtl = false),
            TargetLanguage("German", "de", isRtl = false),
            TargetLanguage("Chinese (Simplified)", "zh-CN", isRtl = false),
            TargetLanguage("Chinese (Traditional)", "zh-TW", isRtl = false),
            TargetLanguage("Japanese", "ja", isRtl = false),
            TargetLanguage("Korean", "ko", isRtl = false),
            TargetLanguage("Russian", "ru", isRtl = false),
            TargetLanguage("Arabic", "ar", isRtl = true),
            TargetLanguage("Turkish", "tr", isRtl = false),
            TargetLanguage("Italian", "it", isRtl = false),
            TargetLanguage("Portuguese", "pt", isRtl = false),
            TargetLanguage("Dutch", "nl", isRtl = false),
            TargetLanguage("Polish", "pl", isRtl = false),
            TargetLanguage("Swedish", "sv", isRtl = false),
            TargetLanguage("Norwegian", "no", isRtl = false),
            TargetLanguage("Danish", "da", isRtl = false),
            TargetLanguage("Finnish", "fi", isRtl = false),
            TargetLanguage("Greek", "el", isRtl = false),
            TargetLanguage("Hebrew", "he", isRtl = true),
            TargetLanguage("Hindi", "hi", isRtl = false),
            TargetLanguage("Urdu", "ur", isRtl = true),
            TargetLanguage("Bengali", "bn", isRtl = false),
            TargetLanguage("Vietnamese", "vi", isRtl = false),
            TargetLanguage("Thai", "th", isRtl = false),
            TargetLanguage("Indonesian", "id", isRtl = false),
            TargetLanguage("Malay", "ms", isRtl = false),
            TargetLanguage("Filipino", "tl", isRtl = false),
            TargetLanguage("Ukrainian", "uk", isRtl = false),
            TargetLanguage("Czech", "cs", isRtl = false),
            TargetLanguage("Romanian", "ro", isRtl = false),
            TargetLanguage("Hungarian", "hu", isRtl = false),
            TargetLanguage("Swahili", "sw", isRtl = false),
            TargetLanguage("Pashto", "ps", isRtl = true),
            TargetLanguage("Kurdish (Sorani)", "ckb", isRtl = true)
        )

        fun named(name: String): TargetLanguage = all.firstOrNull { it.displayName == name } ?: all[0]
    }
}
