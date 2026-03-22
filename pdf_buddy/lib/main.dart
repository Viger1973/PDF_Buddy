import 'package:flutter/material.dart';
import 'screens/pdf_viewer_screen.dart';

void main() {
  runApp(const PdfBuddyApp());
}

class PdfBuddyApp extends StatelessWidget {
  const PdfBuddyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PDF Buddy',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ),
      home: const PdfViewerScreen(),
    );
  }
}
