# Meme Themes v1 Acceptance

## Functional Acceptance

1. Theme catalog:

- All 40+ new theme families appear in /api/v1/themes response
- Each family has light and dark variants available

2. Theme picker:

- New themes visible in theme selection UI
- All themes support light/dark toggle (except High Contrast)

3. Theme application:

- Selecting any new theme applies correct colors
- Light/dark toggle works for all new themes

## Regression Gate

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
