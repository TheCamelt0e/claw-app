#!/usr/bin/env python3
"""Convert SVG assets to PNG for Expo build"""
import cairosvg
from PIL import Image
import io

def svg_to_png(svg_path, png_path, width, height=None):
    """Convert SVG to PNG with specified dimensions"""
    if height is None:
        height = width
    
    # Read SVG
    with open(svg_path, 'rb') as f:
        svg_data = f.read()
    
    # Convert to PNG
    png_data = cairosvg.svg2png(bytestring=svg_data, output_width=width, output_height=height)
    
    # Save
    with open(png_path, 'wb') as f:
        f.write(png_data)
    
    print(f"✅ Created: {png_path} ({width}x{height})")

# Generate all required assets
print("🎨 Generating PNG assets from SVGs...\n")

# Main icon (1024x1024) - used for iOS and fallback
svg_to_png('icon.svg', 'icon.png', 1024)

# Adaptive icon foreground (1024x1024 for Android)
# The adaptive-icon.svg is only 108x108, so we need to recreate it properly
# Let's create a proper adaptive icon
adaptive_svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <circle cx="512" cy="512" r="300" fill="none" stroke="#FF6B35" stroke-width="40"/>
  <path d="M412 512 L512 612 L712 412" fill="none" stroke="#FF6B35" stroke-width="60" stroke-linecap="round" stroke-linejoin="round"/>
</svg>'''

with open('temp-adaptive.svg', 'w') as f:
    f.write(adaptive_svg)
svg_to_png('temp-adaptive.svg', 'adaptive-icon.png', 1024)

# Splash screen (1242x2436)
svg_to_png('splash.svg', 'splash.png', 1242, 2436)

# Notification icon (96x96) - simple version
notification_svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <rect width="96" height="96" fill="#1a1a2e"/>
  <circle cx="48" cy="48" r="28" fill="none" stroke="#FF6B35" stroke-width="8"/>
  <path d="M38 48 L48 58 L68 38" fill="none" stroke="#FF6B35" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
</svg>'''
with open('temp-notification.svg', 'w') as f:
    f.write(notification_svg)
svg_to_png('temp-notification.svg', 'notification-icon.png', 96)

# Favicon (48x48)
favicon_svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <rect width="48" height="48" fill="#1a1a2e" rx="8"/>
  <circle cx="24" cy="24" r="14" fill="none" stroke="#FF6B35" stroke-width="4"/>
  <path d="M18 24 L24 30 L34 20" fill="none" stroke="#FF6B35" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>'''
with open('temp-favicon.svg', 'w') as f:
    f.write(favicon_svg)
svg_to_png('temp-favicon.svg', 'favicon.png', 48)

# Also create a smaller notification sound placeholder (silent wav)
# Create a minimal valid WAV file (silence)
silent_wav = bytes([
    0x52, 0x49, 0x46, 0x46,  # "RIFF"
    0x24, 0x00, 0x00, 0x00,  # file size
    0x57, 0x41, 0x56, 0x45,  # "WAVE"
    0x66, 0x6D, 0x74, 0x20,  # "fmt "
    0x10, 0x00, 0x00, 0x00,  # chunk size
    0x01, 0x00,              # audio format (PCM)
    0x01, 0x00,              # num channels
    0x44, 0xAC, 0x00, 0x00,  # sample rate (44100)
    0x88, 0x58, 0x01, 0x00,  # byte rate
    0x02, 0x00,              # block align
    0x10, 0x00,              # bits per sample
    0x64, 0x61, 0x74, 0x61,  # "data"
    0x00, 0x00, 0x00, 0x00   # data size
])
with open('notification-sound.wav', 'wb') as f:
    f.write(silent_wav)
print(f"✅ Created: notification-sound.wav")

# Clean up temp files
import os
os.remove('temp-adaptive.svg')
os.remove('temp-notification.svg')
os.remove('temp-favicon.svg')

print("\n✨ All assets generated successfully!")
print("\nGenerated files:")
print("  - icon.png (1024x1024)")
print("  - adaptive-icon.png (1024x1024)")
print("  - splash.png (1242x2436)")
print("  - notification-icon.png (96x96)")
print("  - favicon.png (48x48)")
print("  - notification-sound.wav")
