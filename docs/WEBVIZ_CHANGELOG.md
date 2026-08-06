% version: 2.1.2
% date: 05.08.2026

# Changelog

## Webviz 2.1.2 - 05.08.2026

### avif

![Demo video webm](/docs/videos/output-30.avif)

### png

![Changelog image](/docs/images/changelog_system.png)

### mp4

![Demo video](/docs/videos/changelog_demo.mp4)

### webm

![Demo video webm](/docs/videos/changelog_demo.webm)

### hosted

https://webviz.blob.core.windows.net/tutorial-videos/authed-simulationTimeSerie-f6538-imulation-Time-Series-chart-authenticated-chromium/video.webm

![Demo video hosted](https://webviz.blob.core.windows.net/tutorial-videos/authed-simulationTimeSerie-f6538-imulation-Time-Series-chart-authenticated-chromium/video.webm)

<video width="1280" height="720" autoplay loop muted>
  <source src="https://webviz.blob.core.windows.net/tutorial-videos/authed-simulationTimeSerie-f6538-imulation-Time-Series-chart-authenticated-chromium/video.webm" type="video/webm" />
</video>

- Added changelog system
  - _Visible via modal on start page_
- Increased coffee consumption
- Flexed time

## Webviz 2.1.1 - 28.07.2026

### Features

- **New dashboard layout** with improved navigation
- Support for `inline code` snippets in comments
- Integrated [API documentation](https://api.webviz.com)

### Bug Fixes

1. Fixed memory leak in data loader
2. Resolved issue with ~strikethrough~ rendering
3. Corrected timestamp formatting

### Performance

> Significant improvements to rendering speed - up to 40% faster on large datasets

## Webviz 2.1.0 - 15.07.2026

### Breaking Changes

- ⚠️ Deprecated old authentication method
- Updated minimum Node.js version to `18.x`

### Improvements

- [ ] Dark mode (in progress)
- [x] Export to PDF
- [x] Real-time collaboration
- [x] Custom themes

### Technical Details

```javascript
const config = {
  version: "2.1.0",
  features: ["export", "collaborate"],
};
```

---

**Note:** For migration guide, see [MIGRATION.md](./MIGRATION.md)
