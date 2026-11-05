# KIRO motion test report

Run: 5/11/2026, 9:52:28 am · Chromium (headless, no GPU). Normal motion and reduced motion are tested separately.

| | Test | Error |
|---|---|---|

**Home hero cards:** size 138x198px each, cycle 6000 ms, travel 9.9px, sync spread 0 ms between the four cards.

**Frames on Home while animating (3 s):** 27 fps, worst frame 233 ms, 15 frames slower than 34 ms. Cumulative Layout Shift 0.009 (good is under 0.1). Measured in headless Chromium without a graphics card; real browsers with a GPU are expected to be smoother, and real low-end phones may be slower.

**POS toast:** visible for about 3967 ms, then removed.

**Endless animations per page (normal motion):**

- Home: khBob on kh-card kh-a, khBob on kh-card kh-b, khBob on kh-card kh-c, khBob on kh-card kh-d, kiroFloat on deco float, kiroFloat on deco float, kiroFloat on deco float, kiroFloat on deco float, kiroFloat on float, kiroBob on tilt, kiroBob on tilt, kiroBob on tilt, kiroMarquee on kiro-marquee, kiroFloat on float
- Features: none
- Pricing: none
- Marketplace: none
- Blog: none
- Downloads: none
- Contact: none
- Log in (old page): none
- POS app: none
- KIRO LUX shop: none

**With reduced motion:** endless animations still running: Home: khBob, Home: khBob, Home: khBob, Home: khBob.

Not covered: gestures beyond tap (the product has no swipe, long-press, drag or pull-to-refresh features), CPU and memory profiling on real devices, and video baselines (screenshot baselines are in tests/visual).