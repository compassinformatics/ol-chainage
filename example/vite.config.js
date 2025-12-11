import path from 'path';

export default {
  base: './', // use relative paths
  server: {
    port: 1842,
  },
  build: {
    sourcemap: true,
    //rollupOptions: {
    //    external: (id) => id.startsWith('ol/'),
    //},
  },
  resolve: {
    alias: {
      'ol-chainage': path.resolve(__dirname, '../src'),
    },
  },
};
