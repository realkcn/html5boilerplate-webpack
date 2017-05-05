const path = require('path');
const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanPlugin = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const autoprefixer = require('autoprefixer');
//设置输入和输出根目录
const ROOT_PATH = path.resolve(__dirname);
const APP_PATH = path.resolve(ROOT_PATH, 'src');
const DEV_PATH = path.resolve(ROOT_PATH, 'dev');
const BUILD_PATH = path.resolve(ROOT_PATH, 'dist');
process.traceDeprecation = true;
//获取所有入口文件
// const getEntrys = require('./getEntrys')();
const entries = {
    app: [
        path.resolve(__dirname, 'src/js/main.js'),
        path.resolve(__dirname, 'src/js/plugins.js'),
    ]
}
//获取环境
const env = process.env.NODE_ENV;
const watchMode = (env === undefined) ? true : false;
const productMode = (env === 'production') ? true : false;
//循环生成每个入口文件对应的html
const HtmlWebpack = [];
Object.keys(entries).forEach((item, index) => {
    let chunks = [item];
    if (item === 'app') {
        item = 'index';
    }
//动态生成html插件
    HtmlWebpack[index] = new HtmlWebpackPlugin({
        // favicon:'./src/img/favicon.ico', //favicon路径
        filename: `./${item}.html`, //生成的html存放路径，相对于 path
        template: `./src/${item}.html`,
        chunks: chunks,
        inject: true, //允许插件修改哪些内容，包括head与body
        hash: true, //为静态资源生成hash值
        minify: { //压缩HTML文件
            removeComments: true, //移除HTML中的注释
            collapseWhitespace: false //删除空白符与换行符
        }
    })
});
/*1.如果你将应用分开打包到多个 output 文件里（如果你的应用有非常多的
 JS不需要在前期加载，这样做是非常有效的），这里面是有可能会出现冗余代码的，
 因为 Webpack 是独立解析每个文件的依赖的。幸运的是，Webpack 已经有个
 内置的 CommonsChunk 插件处理这个问题：*/
const CommonsChunk = [
    new webpack.optimize.CommonsChunkPlugin({
        name: "commons",
        filename: "commons.js",
        minChunks: 2,
    })
];
/*  现在，纵观所有 output 文件，如果你有任何模块需要加载 2 次或者更多次
 （由 minChunks 设置），这些模块会被打包在 commons.js 里，那么你就
 可以让它在客户端里缓存起来。当然，这会导致产生一个额外的头部请求，但是
 你可以阻止客户端多次下载同一个库。在许多场景下，会有一个速度的净收益。*/
//公共的插件
const commonPlugin = [
    //热插拔
    new webpack.HotModuleReplacementPlugin(),
    //拷贝资源插件
    new CopyWebpackPlugin([{
        from: path.resolve(ROOT_PATH, 'assets'),
        to: env === 'development' ? path.resolve(DEV_PATH, 'assets') : path.resolve(BUILD_PATH, 'assets')
    }])
]
module.exports = function () {
    config =
        {
            entry: entries,
            output: {
                path: env === 'development' ? DEV_PATH : BUILD_PATH,
                /*publicPath: "/assets",*/
                filename: "[name].js"
            },
            //目前最流行的Source Maps选项是cheap-module-eval-source-map，这个工具会帮助开发环境下在Chrome/Firefox中显示源代码文件，其速度快于source-map与eval-source-map：
            devtool: !productMode ? 'cheap-module-eval-source-map' : 'hidden-source-map',
            devServer: {
                contentBase: ROOT_PATH,
                historyApiFallback: true,
                hot: true,
                open: true,
                inline: true,
                port: 8888
            },
            module: {
                rules: [{
                    test: /\.(css|sass)$/,
                    use: [
                        {loader: 'style-loader'},
                        {loader: 'css-loader', options: {sourceMap: !productMode, importLoaders: 1}},
                        {
                            loader: 'postcss-loader', options: {
                            plugins: [autoprefixer({browsers: ['last 2 versions']})],
                            sourceMap: !productMode,
                            ident: 'postcss'
                        }
                        }
                    ],
                    include: APP_PATH
                }, {
                    test: /\.(png|jpg|gif|jpeg)$/, //处理css文件中的背景图片
                    use: [{
                        loader: 'url-loader',
                        query: {
                            //当图片大小小于这个限制的时候，会自动启用base64编码图片。减少http请求,提高性能
                            limit: 1,
                            name: './assets/[name].[hash:4].[ext]'
                        }
                    }]
                }, {
                    test: /\.html$/, //获取html里面的图片
                    loader: 'html-loader'
                }, {
                    //当我们需要读取json格式文件时，我们不再需要安装任何loader，webpack2中将会内置 json-loader，自动支持json格式的读取（喜大普奔啊）。
                    test: /\.json$/, //获取json数据的loader
                    loader: 'json-loader'
                }, {
                    test: /\.(js|jsx)$/, //用babel编译jsx和es6
                    exclude: /node_modules/,
                    use: [{
                        loader: 'babel-loader',
                        options: {
                            cacheDirectory: true,
                            sourceMap: !productMode,
                            presets: ['es2015', 'react'],
                            plugins: [
                                ["transform-object-rest-spread"],
                                ["transform-runtime"]
                            ]
                        }
                    }],
                }]
            },
            resolve: {
                //注意一下, extensions webpack2第一个不是空字符串! 对应不需要后缀的情况.
                extensions: ['.js', '.json', '.css', '.sass', '.scss', '.less', 'jsx', '.vue'],
                //模块别名定义，方便后续直接引用别名，无须多写长长的地址
                alias: {
                    'css': path.resolve(__dirname, './src/css'),
                }
            },

            externals: {
                jquery: 'jQuery'
            },

            plugins: HtmlWebpack.concat(commonPlugin).concat([
                new webpack.ProvidePlugin({
                    $: 'jquery',
                    jQuery: 'jquery',
                    'window.jQuery': 'jquery',
                    'window.$': 'jquery' })
            ]),
            watch: watchMode
        }
    switch (env) {
        case 'production':
            config.plugins = (config.plugins || []).concat([
                new webpack.DefinePlugin({
                    'process.env': {
                        NODE_ENV: '"production"'
                    }
                }),
                //loader的最小化文件模式将会在webpack 3或者后续版本中被彻底取消掉.为了兼容部分旧式loader，你可以通过 LoaderOptionsPlugin 的配置项来提供这些功能。
                new webpack.LoaderOptionsPlugin({
                    minimize: true
                }),
                //每次运行webpack清理上一次的文件夹
                new CleanPlugin([BUILD_PATH]),
                //压缩混淆JS插件,UglifyJsPlugin 将不再支持让 Loaders 最小化文件的模式。debug 选项已经被移除。Loaders 不能从 webpack 的配置中读取到他们的配置项。
                new webpack.optimize.UglifyJsPlugin({
                    compress: {
                        warnings: false,
                        drop_console: true
                    },
                    comments: false,
                    beautify: false,
                    sourceMap: false
                })
            ]);
            break;
    }
    return config;
}
