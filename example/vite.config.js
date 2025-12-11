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
      // when developing uncomment below to work directly with the source files
      // 'ol-chainage': path.resolve(__dirname, '../src'),
    },
  },
};
