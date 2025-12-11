import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';

export default {
    input: 'src/index.js',
    output: [
        {
            file: 'dist/index.esm.js',
            format: 'esm',
            sourcemap: true,
        },
        {
            file: 'dist/index.umd.js',
            format: 'umd',
            name: 'OlChainage',   // global name for UMD build
            sourcemap: true,
            globals: {
                'ol/Feature.js': 'ol.Feature',
                'ol/geom/LineString.js': 'ol.geom.LineString',
                'ol/style/Fill.js': 'ol.style.Fill',
                'ol/style/Text.js': 'ol.style.Text',
                'ol/proj.js': 'ol.proj',
                'ol/style/Stroke.js': 'ol.style.Stroke',
                'ol/style/Style.js': 'ol.style.Style',
                'ol/style': 'ol.style',
                'ol/layer/Vector.js': 'ol.layer.Vector',
                'ol/source/Vector.js': 'ol.source.Vector',
                'ol/sphere.js': 'ol.sphere',
                'proj4': 'proj4',
                'ol/proj/proj4.js': 'proj4',
            },
        },
    ],
    external: (id) => id.startsWith('ol/') || id === 'proj4',
    plugins: [
        resolve(),
        commonjs(),
        babel({
            babelHelpers: 'bundled',
            presets: [
                [
                    '@babel/preset-env',
                    {
                        // Browsers with more than 0.25% market share excluding browsers that are dead (no updates for 24 months)
                        targets: '> 0.25%, not dead',
                    },
                ],
            ],
            exclude: 'node_modules/**',
        }),
    ],
};
