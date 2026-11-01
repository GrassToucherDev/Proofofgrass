import sys, numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src)
if im.mode == "RGBA" and np.array(im)[...,3].min() < 250:
    rgba = np.array(im)
else:
    rgb = np.array(im.convert("RGB")).astype(int)
    mn, mx = rgb.min(2), rgb.max(2)
    cand = (mn >= 205) & ((mx - mn) <= 14)
    lab, n = ndi.label(cand)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:,0], lab[:,-1]]))) - {0}
    bg = np.isin(lab, list(edge))
    bg = ndi.binary_opening(bg, iterations=1) | (bg & False)
    # drop the thin light fringe left against the outline
    fg = ~bg
    fg = ndi.binary_opening(fg, iterations=2)
    lab2, n2 = ndi.label(fg)
    if n2:
        sizes = ndi.sum(fg, lab2, range(1, n2+1)); keep = [i+1 for i, s in enumerate(sizes) if s > 0.002*fg.size]
        fg = np.isin(lab2, keep)
    fg = ndi.binary_fill_holes(fg)
    fg = ndi.binary_erosion(fg, iterations=1)
    a = cv2.GaussianBlur(fg.astype(np.float32), (0,0), 1.2)
    rgba = np.dstack([np.array(im.convert("RGB")), (a*255).astype(np.uint8)])
out = Image.fromarray(rgba, "RGBA")
bbox = out.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
out = out.crop(bbox); pad = 24
w, h = out.size; s = max(w, h) + 2*pad
canvas = Image.new("RGBA", (s, s), (0,0,0,0)); canvas.paste(out, ((s-w)//2, (s-h)//2), out)
canvas = canvas.resize((800, 800), Image.LANCZOS)
canvas.save(dst, "WEBP", quality=90, method=6)
