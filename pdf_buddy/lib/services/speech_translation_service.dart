import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:google_mlkit_translation/google_mlkit_translation.dart';
import 'package:translator/translator.dart' as web_translate;
import 'dart:io' show Platform;

class SpeechTranslationService {
  final FlutterTts _tts = FlutterTts();
  final OnDeviceTranslator? _translator;
  final web_translate.GoogleTranslator _webTranslator = web_translate.GoogleTranslator();
  final String sourceLanguage;
  final String targetLanguage;

  static bool get isMobile => !kIsWeb && (Platform.isAndroid || Platform.isIOS);

  SpeechTranslationService({
    this.sourceLanguage = 'en',
    this.targetLanguage = 'it',
  }) : _translator = !isMobile
            ? null
            : OnDeviceTranslator(
                sourceLanguage: TranslateLanguage.values.firstWhere(
                  (e) => e.bcpCode == sourceLanguage,
                  orElse: () => TranslateLanguage.english,
                ),
                targetLanguage: TranslateLanguage.values.firstWhere(
                  (e) => e.bcpCode == targetLanguage,
                  orElse: () => TranslateLanguage.italian,
                ),
              );

  Future<void> init() async {
    // Configure TTS
    try {
      await _tts.setLanguage(sourceLanguage);
      await _tts.setSpeechRate(0.5);
      await _tts.setVolume(1.0);
      await _tts.setPitch(1.0);
    } catch (e) {
      debugPrint('TTS Initialization Error: $e');
    }

    if (!isMobile) return; // ML Kit doesn't support Web/Desktop

    // Ensure models are available (Offline focus)
    final modelManager = OnDeviceTranslatorModelManager();
    final isDownloaded = await modelManager.isModelDownloaded(sourceLanguage);
    if (!isDownloaded) {
      await modelManager.downloadModel(sourceLanguage);
    }
    
    final isTargetDownloaded = await modelManager.isModelDownloaded(targetLanguage);
    if (!isTargetDownloaded) {
      await modelManager.downloadModel(targetLanguage);
    }
  }

  Future<String> translate(String text) async {
    debugPrint('Translate called: "$text", isMobile: $isMobile');
    if (!isMobile) {
      try {
        final translation = await _webTranslator.translate(
          text,
          from: sourceLanguage,
          to: targetLanguage,
        );
        return translation.text;
      } catch (e) {
        debugPrint('Web Translation Error: $e');
        return '[Web Error] $text -> [Traduzione $targetLanguage]';
      }
    }

    try {
      if (_translator == null) return 'Translator not initialized';
      final translation = await _translator!.translateText(text);
      return translation;
    } catch (e) {
      debugPrint('Translation Error Detail: $e');
      return 'Translation Error: $e';
    }
  }

  Future<void> speak(String text) async {
    try {
      await _tts.speak(text);
    } catch (e) {
      debugPrint('TTS Speak Error: $e');
    }
  }

  void dispose() {
    _translator?.close();
    _tts.stop();
  }
}
