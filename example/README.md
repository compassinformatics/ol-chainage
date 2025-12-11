# Example

To run:

```
cd example
npm install
npm start
# http://localhost: 1871
```

To build:

```
cd example
npm run build
```

Then deploy the contents of the `dist` directory to your server. 
You can also run `npm run serve` to serve the results of the `dist` directory for preview.

## Development

In `vite.config.js` uncomment `// 'ol-chainage': path.resolve(__dirname, '../src'),` to work directly with source files
rather than the published package.