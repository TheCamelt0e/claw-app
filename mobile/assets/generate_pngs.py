#!/usr/bin/env python3
"""Generate PNG assets using Pillow"""
from PIL import Image, ImageDraw, ImageFont
import math

def create_icon(size, filename):
    """Create the main CLAW icon"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background gradient simulation (solid dark color)
    bg_color = (26, 26, 46)  # #1a1a2e
    draw.rounded_rectangle([0, 0, size, size], radius=size//6, fill=bg_color)
    
    # Circle
    center = size // 2
    radius = int(size * 0.3)
    orange = (255, 107, 53)  # #FF6B35
    
    # Draw circle outline
    draw.ellipse(
        [center - radius, center - radius, center + radius, center + radius],
        outline=orange, width=max(4, size // 40)
    )
    
    # Checkmark
    check_width = max(6, size // 25)
    # Three points of checkmark
    p1 = (center - radius//2, center)
    p2 = (center, center + radius//2)
    p3 = (center + radius//2 + 10, center - radius//2 - 10)
    
    draw.line([p1, p2, p3], fill=orange, width=check_width)
    
    img.save(filename, 'PNG')
    print(f"[OK] Created: {filename} ({size}x{size})")

def create_splash(width, height, filename):
    """Create splash screen"""
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Gradient background (top to bottom)
    for y in range(height):
        ratio = y / height
        r = int(26 + (15 - 26) * ratio)
        g = int(26 + (52 - 26) * ratio)
        b = int(46 + (96 - 46) * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    center_x = width // 2
    center_y = height // 2 - 100
    radius = 150
    orange = (255, 107, 53)
    
    # Circle
    draw.ellipse(
        [center_x - radius, center_y - radius, center_x + radius, center_y + radius],
        outline=orange, width=20
    )
    
    # Checkmark
    p1 = (center_x - radius//2, center_y)
    p2 = (center_x, center_y + radius//2)
    p3 = (center_x + radius//2 + 20, center_y - radius//2 - 20)
    draw.line([p1, p2, p3], fill=orange, width=35)
    
    # CLAW text
    try:
        font_large = ImageFont.truetype("arial.ttf", 80)
        font_small = ImageFont.truetype("arial.ttf", 36)
    except:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Draw text
    text = "CLAW"
    bbox = draw.textbbox((0, 0), text, font=font_large)
    text_width = bbox[2] - bbox[0]
    draw.text((center_x - text_width//2, center_y + radius + 80), text, font=font_large, fill=orange)
    
    tagline = "Capture now. Strike later."
    bbox = draw.textbbox((0, 0), tagline, font=font_small)
    text_width = bbox[2] - bbox[0]
    draw.text((center_x - text_width//2, center_y + radius + 170), tagline, font=font_small, fill=(136, 136, 136))
    
    img.save(filename, 'PNG')
    print(f"[OK] Created: {filename} ({width}x{height})")

def create_notification_icon(size, filename):
    """Create notification icon (smaller, simpler)"""
    img = Image.new('RGBA', (size, size), (26, 26, 46, 255))
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    radius = size // 3
    orange = (255, 107, 53)
    
    draw.ellipse(
        [center - radius, center - radius, center + radius, center + radius],
        outline=orange, width=max(3, size // 15)
    )
    
    # Smaller checkmark
    p1 = (center - radius//2, center)
    p2 = (center, center + radius//2)
    p3 = (center + radius//2, center - radius//2)
    draw.line([p1, p2, p3], fill=orange, width=max(4, size // 10))
    
    img.save(filename, 'PNG')
    print(f"[OK] Created: {filename} ({size}x{size})")

def create_favicon(size, filename):
    """Create favicon"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    bg_color = (26, 26, 46)
    radius = size // 5
    draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=bg_color)
    
    center = size // 2
    circle_radius = size // 3
    orange = (255, 107, 53)
    
    draw.ellipse(
        [center - circle_radius, center - circle_radius, center + circle_radius, center + circle_radius],
        outline=orange, width=max(2, size // 20)
    )
    
    p1 = (center - circle_radius//2, center)
    p2 = (center, center + circle_radius//2)
    p3 = (center + circle_radius//2, center - circle_radius//2)
    draw.line([p1, p2, p3], fill=orange, width=max(3, size // 12))
    
    img.save(filename, 'PNG')
    print(f"[OK] Created: {filename} ({size}x{size})")

# Create silent WAV file
def create_silent_wav(filename):
    """Create a minimal silent WAV file"""
    import struct
    
    # WAV header for 44100Hz, 16-bit, mono, 0.1 seconds of silence
    sample_rate = 44100
    bits_per_sample = 16
    num_channels = 1
    duration = 0.1
    num_samples = int(sample_rate * duration)
    byte_rate = sample_rate * num_channels * bits_per_sample // 8
    block_align = num_channels * bits_per_sample // 8
    data_size = num_samples * block_align
    file_size = 36 + data_size
    
    with open(filename, 'wb') as f:
        # RIFF header
        f.write(b'RIFF')
        f.write(struct.pack('<I', file_size))
        f.write(b'WAVE')
        
        # fmt chunk
        f.write(b'fmt ')
        f.write(struct.pack('<I', 16))  # chunk size
        f.write(struct.pack('<H', 1))   # audio format (PCM)
        f.write(struct.pack('<H', num_channels))
        f.write(struct.pack('<I', sample_rate))
        f.write(struct.pack('<I', byte_rate))
        f.write(struct.pack('<H', block_align))
        f.write(struct.pack('<H', bits_per_sample))
        
        # data chunk
        f.write(b'data')
        f.write(struct.pack('<I', data_size))
        f.write(b'\x00' * data_size)
    
    print(f"[OK] Created: {filename}")

# Generate all assets
print("Generating CLAW app assets...\n")

create_icon(1024, 'icon.png')
create_icon(1024, 'adaptive-icon.png')
create_splash(1242, 2436, 'splash.png')
create_notification_icon(96, 'notification-icon.png')
create_favicon(48, 'favicon.png')
create_silent_wav('notification-sound.wav')

print("\n[OK] All assets generated successfully!")
