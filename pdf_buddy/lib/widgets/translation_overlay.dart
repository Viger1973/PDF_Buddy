import 'package:flutter/material.dart';

class TranslationOverlay {
  static OverlayEntry? _currentEntry;

  static void show(
    BuildContext context, {
    required String originalText,
    required String translatedText,
    required VoidCallback onPlayTts,
    required Offset position,
  }) {
    // Dismiss previous overlay
    _currentEntry?.remove();
    _currentEntry = null;

    final overlay = Overlay.of(context);
    
    _currentEntry = OverlayEntry(
      builder: (context) => Positioned(
        left: position.dx - 100, // Center of a 200px wide container
        top: position.dy - 120, // Positioned closer above
        child: Material(
          color: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            constraints: const BoxConstraints(maxWidth: 200),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFDE7), // Light Yellow
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.yellow.shade700, width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 10,
                  spreadRadius: 1,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        originalText,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontWeight: FontWeight.w500,
                          fontSize: 11,
                          color: Colors.orange.shade800,
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Container(
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: Icon(Icons.volume_up, size: 16, color: Colors.orange.shade700),
                        onPressed: onPlayTts,
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  translatedText,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.brown.shade900,
                    height: 1.1,
                  ),
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: GestureDetector(
                    onTap: () {
                      _currentEntry?.remove();
                      _currentEntry = null;
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.yellow.shade800,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Chiudi',
                        style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    overlay.insert(_currentEntry!);
  }

  static void hide() {
    _currentEntry?.remove();
    _currentEntry = null;
  }
}
