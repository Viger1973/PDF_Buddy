import 'dart:async';
import 'package:flutter/foundation.dart'; // For Uint8List and kIsWeb
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'package:collection/collection.dart';
import '../services/speech_translation_service.dart';
import '../widgets/translation_overlay.dart';
import 'package:pdfrx/pdfrx.dart';

class PdfViewerScreen extends StatefulWidget {
  const PdfViewerScreen({super.key});

  @override
  State<PdfViewerScreen> createState() => _PdfViewerScreenState();
}

class _PdfViewerScreenState extends State<PdfViewerScreen> {
  Uint8List? _pdfBytes;
  String? _pdfFileName;
  final PdfViewerController _pdfController = PdfViewerController();
  final SpeechTranslationService _service = SpeechTranslationService();
  
  Timer? _hoverTimer;
  Offset? _lastHoverPosition;

  @override
  void initState() {
    super.initState();
    _initService();
  }

  Future<void> _initService() async {
    await _service.init();
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf'],
      withData: true, // Required for Web
    );

    if (result != null && result.files.single.bytes != null) {
      setState(() {
        _pdfBytes = result.files.single.bytes;
        _pdfFileName = result.files.single.name;
      });
    }
  }

  void _onSelectionChanged(List<PdfTextRanges> selections) async {
    if (selections.isEmpty || selections.first.ranges.isEmpty) return;

    final selection = selections.first;
    final range = selection.ranges.first;
    final word = selection.pageText.fullText.substring(range.start, range.end).trim();
    if (word.isEmpty) return;

    // Get a reasonable position for the overlay if we don't have a tap
    final position = Offset(
      MediaQuery.of(context).size.width / 2,
      MediaQuery.of(context).size.height / 2,
    );

    _translateAndShow(word, position);
  }

  @override
  void dispose() {
    _hoverTimer?.cancel();
    _service.dispose();
    super.dispose();
  }

  void _onHover(PointerHoverEvent event) {
    _lastHoverPosition = event.localPosition;
    _hoverTimer?.cancel();
    _hoverTimer = Timer(const Duration(milliseconds: 250), _handleHoverDwell);
  }

  Future<void> _handleHoverDwell() async {
    if (_lastHoverPosition == null) return;

    final hitResult = _pdfController.getPdfPageHitTestResult(
      _lastHoverPosition!,
      useDocumentLayoutCoordinates: false,
    );

    if (hitResult == null) return;

    try {
      final pageText = await hitResult.page.loadText();
      // Find the fragment that contains the hit offset
      final fragment = pageText.fragments.firstWhereOrNull(
        (f) => f.bounds.containsPoint(hitResult.offset),
      );

      if (fragment != null) {
        // More precise word detection: find the character index and expand to word
        final charIndex = fragment.charRects.indexWhere(
          (rect) => rect.containsPoint(hitResult.offset),
        );

        if (charIndex != -1) {
          final wordRange = _extractWordRangeAt(pageText.fullText, fragment.index + charIndex);
          if (wordRange != null) {
            final word = pageText.fullText.substring(wordRange.start, wordRange.end).trim();
            if (word.isNotEmpty) {
              // Get precise bounds for the word
              final rangeWithFragments = PdfTextRangeWithFragments.fromTextRange(
                pageText, 
                wordRange.start, 
                wordRange.end,
              );
              
              if (rangeWithFragments != null) {
                // Position at the mouse position (centered horizontally)
                _translateAndShow(word, _lastHoverPosition!);
              }
            }
          }
        }
      }
    } catch (e) {
      debugPrint('Hover translation error: $e');
    }
  }

  PdfTextRange? _extractWordRangeAt(String text, int index) {
    if (index < 0 || index >= text.length) return null;
    
    // Find start of word
    int start = index;
    while (start > 0 && _isWordChar(text[start - 1])) {
      start--;
    }
    
    // Find end of word
    int end = index;
    while (end < text.length && _isWordChar(text[end])) {
      end++;
    }
    
    return PdfTextRange(start: start, end: end);
  }

  bool _isWordChar(String char) {
    final code = char.codeUnitAt(0);
    return (code >= 65 && code <= 90) || // A-Z
           (code >= 97 && code <= 122) || // a-z
           (code >= 48 && code <= 57) || // 0-9
           code == 39; // apostrophe
  }

  void _translateAndShow(String word, Offset position) async {
    final translation = await _service.translate(word);
    
    if (!mounted) return;

    // Use global position for the overlay
    final renderBox = context.findRenderObject() as RenderBox;
    final globalPosition = renderBox.localToGlobal(position);

    TranslationOverlay.show(
      context,
      originalText: word,
      translatedText: translation,
      onPlayTts: () => _service.speak(word),
      position: globalPosition,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PDF Buddy'),
        actions: [
          IconButton(
            icon: const Icon(Icons.file_open),
            onPressed: _pickFile,
            tooltip: 'Select PDF',
          ),
        ],
      ),
      body: _pdfBytes == null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                   const Icon(Icons.picture_as_pdf, size: 80, color: Colors.grey),
                   const SizedBox(height: 16),
                   const Text('No PDF selected', style: TextStyle(fontSize: 18)),
                   const SizedBox(height: 24),
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.pink.withOpacity(0.1),
                            blurRadius: 4,
                          )
                        ]
                      ),
                      child: IconButton(
                        onPressed: _pickFile,
                        icon: const Icon(Icons.add),
                        iconSize: 30,
                        color: Colors.pink,
                        tooltip: 'Load PDF',
                      ),
                    ),
                ],
              ),
            )
          : MouseRegion(
              onHover: _onHover,
              child: PdfViewer.data(
                _pdfBytes!,
                sourceName: _pdfFileName ?? 'document.pdf',
                controller: _pdfController,
                params: PdfViewerParams(
                  enableTextSelection: true,
                  onTextSelectionChange: _onSelectionChanged,
                  loadingBannerBuilder: (context, bytesDownloaded, totalBytes) => 
                    const Center(child: CircularProgressIndicator()),
                ),
              ),
            ),
    );
  }
}
