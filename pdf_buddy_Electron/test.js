const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`);
  });

  win.loadFile('index.html');
  
  win.webContents.once('did-finish-load', () => {
     win.webContents.executeJavaScript(`
        const base64PDF = "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPU0FBAQj1dMw1NRx1NRQ01rQQU6erqmGkoYqGrgS4QhRQKQjUU8QyAABxYCvMKZW5kc3RyZWFtCmVuZG9iagoKCjMgMCBvYmoKNDYKZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvUGFnZS9NZWRpYUJveCBbMCAwIDU5NSA4NDJdCi9SZXNvdXJjZXM8PC9Gb250PDwvRjEgNSAwIFI+Pj4+Ci9Db250ZW50cyAyIDAgUgovUGFyZW50IDYgMCBSCj4+CmVuZG9iagoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKCjYgMCBvYmoKPDwvVHlwZS9QYWdlcy9Db3VudCAxL0tpZHNbNCAwIFJdPj4KZW5kb2JqCgo3IDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYWdlcyA2IDAgUj4+CmVuZG9iagoKOCAwIG9iago8PC9Qcm9kdWNlcihEckhvc2UncyBSdWJieSBQREYgR2VuZXJhdG9yKQovQ3JlYXRvcihBbm9ueW1vdXMpPj4KZW5kb2JqCgp4cmVmCjAgOQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDAxNyAwMDAwMCBuIAowMDAwMDAwMTM1IDAwMDAwIG4gCjAwMDAwMDAxNTYgMDAwMDAgbiAKMDAwMDAwMDI1OCAwMDAwMCBuIAowMDAwMDAwMzQ2IDAwMDAwIG4gCjAwMDAwMDA0MDUgMDAwMDAgbiAKMDAwMDAwMDQ1NSAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgOS9Sb290IDcgMCBSCi9JbmZvIDggMCBSPj4Kc3RhcnR4cmVmCjU0OQolJUVPRg==";
        function base64ToArrayBuffer(base64) {
            var binary_string = window.atob(base64);
            var len = binary_string.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
                bytes[i] = binary_string.charCodeAt(i);
            }
            return bytes.buffer;
        }
        if(window.renderPDF) {
            window.renderPDF(base64ToArrayBuffer(base64PDF)).then(() => {
                console.log("PDF rendered successfully. Searching for textLayer...");
                setTimeout(() => {
                    const textLayers = document.querySelectorAll('.textLayer');
                    console.log("textLayers found: " + textLayers.length);
                    if (textLayers.length > 0) {
                        const spans = document.querySelectorAll('.textLayer span');
                        console.log("spans in first page: " + spans.length);
                        if (spans.length > 0) {
                           console.log("First span text: " + spans[0].textContent);
                           const r = spans[0].getBoundingClientRect();
                           console.log("First span rect: l=" + r.left + " t=" + r.top + " w=" + r.width + " h=" + r.height);
                           // simulate hover
                           const centerX = r.left + r.width/2;
                           const centerY = r.top + r.height/2;
                           const ev = new MouseEvent('mousemove', { clientX: centerX, clientY: centerY, bubbles: true });
                           document.dispatchEvent(ev);
                        }
                    }
                }, 1000);
            }).catch(e => console.log("renderPDF error: " + e.message));
        } else {
            console.log("renderPDF not exported");
        }
     `);
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
