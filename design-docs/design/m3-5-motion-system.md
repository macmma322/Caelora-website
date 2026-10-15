# M3.5 motion system

## Purpose and implementation

Motion gives a sense of entering and inhabiting a landscape. It never blocks a link, form or natural scroll input. Astro renders all content statically. No React, GSAP, scroll interception library or animation dependency was added.

| Component            | Purpose                                                     | Mechanism / timing                                                                                                        | Interruption and accessibility                                                                        |
| -------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Opening copy         | Gentle arrival, once per page load                          | 700ms ease-out, 12px translate and modest opacity                                                                         | Content is present immediately; reduced motion removes entrance; brand image is static for prompt LCP |
| Opening landscape    | Distinguish distant landscape, atmosphere and near terrain  | Native CSS view timeline; independent 14% / -12% / -40% movement                                                          | JS fallback only without CSS timeline support; static <=60rem/reduced motion                          |
| Wilderness to hearth | One selective sticky journey with a continuous camera move  | 190svh section, one 100svh stage; landscape scale 1.04 to 1.36 and -40px travel; middle trees +65px and near trees +160px | Native scroll remains free; no wheel/touch prevention; rapid reversal immediately updates geometry    |
| Chapter transition   | Keep a legible statement through the environmental change   | Switch at midpoint with interruptible 160ms opacity transition; no extended unreadable gap                                | Both chapters remain semantic content; static layouts put them in normal flow                         |
| Atmosphere           | Transfer focus from left wilderness copy to right home copy | Independent opacity on directional scrims                                                                                 | No blur/filter animation; not a new claimed environment                                               |
| Dragon plate         | Reveal monumental scale without inventing landscape art     | Bounded depth translation, separate near silhouette                                                                       | Complete static composition on mobile; original studio background honestly retained                   |
| Navigation           | Persistent wayfinding                                       | 160ms underline/color, 240ms background                                                                                   | Keyboard transitions disabled; current chapter updates from intersection/progress                     |
| Buttons              | Confirm press                                               | 100/160ms, scale 0.98                                                                                                     | No effect on disabled controls; hover gated to fine pointers                                          |
| Gallery              | Preserve context and make artwork accessible                | Native dialog, 240ms small translation/opacity; decode before swapping                                                    | Arrow keys, Escape, focus return, race-safe async decode, load error; direct media links without JS   |
| Account/security     | Efficient frequent operations                               | Immediate feedback and existing real pending/success/error states                                                         | No cinematic animation; real API and native confirmation remain authoritative                         |

Easing: cubic-bezier(0.23,1,0.32,1), defined in shared tokens. Scene movement is tied to scroll, not a delayed tween. No auto-scrolling to continue the story and no obligatory preloader/video/audio. Direct navigation to Your path resolves to the home phase; reduced-motion/no-script navigation uses the actual article.

## Engineering contract

IntersectionObserver limits work to near-visible scenes. One scheduled requestAnimationFrame per scroll event; no perpetual loop. Geometry is cached and measured on resize, not interleaved per-layer layout reads/writes. Transforms/opacity are written directly to leaf layers, not inherited CSS variables on the root. AbortController, observer disconnect and animation-frame cancellation handle teardown and media changes. Changing reduced-motion or viewport removes enhancement styles and restores readable flow. Browser visibility pauses scheduling. Desktop screenshot evidence includes five exact scroll phases rather than attempting to infer motion from one full-page image.

The initial version alpha-blended two differently framed landscape copies; independent critique found a ghosted midpoint and low text opacity. Final version uses one continuous landscape camera, and the second image exists only as the static fallback's settlement plate. Near silhouettes recede down out of the view rather than exposing a floating strip of terrain. This is why recorded final evidence matters.

## Performance evidence

See artifacts/m3-5 for Chrome tracing, frame interval data, Lighthouse reports and motion recordings. Frame intervals in headless Chrome are lab evidence, not a guarantee on physical low-end hardware. Field INP and physical iOS/Android verification remain unavailable locally. No INP claim is inferred from total blocking time.
