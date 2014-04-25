define(
    [
        'require',
        'jquery',
        'moddef',
        'modules/canvas-drawer',
        'vendor/raf',
        'vendor/blur-filter'
    ],
    function(
        require,
        $,
        M,
        Draw,
        _raf,
        Blur
    ) {

        'use strict';

        var blur = new Blur();

        var colors = {
            'grey': 'rgb(220, 220, 220)'
            ,'greyDark': 'rgb(200, 200, 200)'
            ,'deepGrey': 'rgb(67, 67, 67)'
            ,'blue': 'rgb(40, 136, 228)'
            ,'blueLight': 'rgb(91, 191, 243)'
            ,'blueDark': 'rgb(18, 84, 151)'
            ,'blueGlass': 'rgb(221, 249, 255)'
            ,'green': 'rgb(121, 229, 0)'
            ,'greenLight': 'rgb(125, 242, 129)'
            ,'greenDark': 'rgb(64, 128, 0)'
            ,'red': 'rgb(233, 63, 51)'
            ,'redLight': 'rgb(244, 183, 168)'
            ,'redDark': 'rgb(167, 42, 34)'
        };

        function throttle( fn, delay, scope ){
            var to
                ,call = false
                ,args
                ,cb = function(){
                    clearTimeout( to );
                    if ( call ){
                        call = false;
                        to = setTimeout(cb, delay);
                        fn.apply(scope, args);
                    } else {
                        to = false;
                    }
                }
                ;

            scope = scope || null;

            return function(){
                call = true;
                args = arguments;
                if ( !to ){
                    cb();
                }
            };
        }

        function logerr(){
            console.log(arguments);
        }

        var lensStyles = {
                lineWidth: 2
                ,strokeStyle: colors.blueLight
                ,fillStyle: colors.blueGlass
                ,shadowBlur: 1
                ,shadowColor: colors.blueLight
                ,lineCap: 'round'
            }
            ,pointStyles = {
                lineWidth: 1
                ,strokeStyle: colors.blue
                ,fillStyle: colors.blue
            }
            ,screenStyles = {
                lineWidth: 3
                ,strokeStyle: colors.deepGrey
                ,lineCap: 'round'
            }
            ,screenHatchStyles = {
                lineWidth: 2
                ,strokeStyle: colors.greyDark
                ,lineCap: 'round'
            }
            ,arrowStyles = {
                lineWidth: 2
                ,strokeStyle: colors.greenDark
                ,fillStyle: colors.green
            }
            ;

        function dist( x, y, x2, y2 ){
            x2 -= x;
            y2 -= y;
            return Math.sqrt( x2*x2 + y2*y2 );
        }

        function makeLens( x, y, height, f ){
            var lens = {
                pos: {
                    x: x
                    ,y: y
                }

                ,focalDistance: f
                ,height: height

                ,draw: function( ctx ){

                    var h2 = this.height/2
                        ,pos = this.pos
                        ,x = pos.x
                        ,y = pos.y
                        ,f = this.focalDistance
                        ;

                    Draw( ctx )
                        .styles( lensStyles )
                        // left side
                        .quadratic( x, y - h2, x, y + h2, x - f * 0.4, y )
                            .fill()
                        // right side
                        .quadratic( x+2, y - h2, x+2, y + h2, x + f * 0.4, y )
                            .fill()
                        .styles( pointStyles )
                        // left focal pt
                        .circle( x - f, y, 3 )
                            .fill()
                        // right focal pt
                        .circle( x + f, y, 3 )
                            .fill()
                        ;
                }
            };

            return lens;
        }

        function makeRays( lens, origin, screen ){

            var styles = {
                shadowBlur: 1
                ,lineCap: 'round'
            };

            function rayFrom( ox, oy, color ){

                var d
                    ,l
                    ,x
                    ,y
                    ;

                // center
                x = ox;
                y = oy;
                d = dist( x, y, lens.pos.x, lens.pos.y );
                l = (screen.pos.x - x) * d / (lens.pos.x - x);
                y += ( screen.pos.y - y ) * l / d;

                if ( y > (screen.pos.y + screen.height / 2) || y < (screen.pos.y - screen.height / 2) ){
                    // elongate the ray if it won't hit the screen
                    l += 500;
                }

                styles.strokeStyle = styles.shadowColor = colors[color];

                Draw.styles( styles )
                    .line( ox, oy, lens.pos.x, lens.pos.y, l )
                    ;

                // Farside focal
                x = lens.pos.x;
                y = lens.pos.y - oy;
                d = dist( x, y, lens.pos.x + lens.focalDistance, lens.pos.y );
                l = (screen.pos.x - x) * d / (lens.pos.x + lens.focalDistance - x);
                y += ( screen.pos.y - y ) * l / d;

                if ( y > (screen.pos.y + screen.height / 2) || y < (screen.pos.y - screen.height / 2) ){
                    // elongate the ray if it won't hit the screen
                    l += 500;
                }

                styles.strokeStyle = styles.shadowColor = colors[color+'Light'];

                Draw.styles( styles )
                    .line( ox, oy, lens.pos.x, oy )
                    .line( lens.pos.x, oy, lens.pos.x + lens.focalDistance, lens.pos.y, l )
                    ;

                // Nearside focal
                x = ox;
                y = oy;
                d = dist( x, y, lens.pos.x - lens.focalDistance, lens.pos.y );
                l = (lens.pos.x - x) * d / (lens.pos.x - lens.focalDistance - x);
                y += ( lens.pos.y - y ) * l / d;

                if ( y < (lens.pos.y + lens.height / 2) && y > (lens.pos.y - lens.height / 2) ){

                    styles.strokeStyle = styles.shadowColor = colors[color+'Dark'];

                    Draw.styles( styles )
                        .line( ox, oy, lens.pos.x - lens.focalDistance, lens.pos.y, l )
                        .line( lens.pos.x, y, lens.pos.x + 1000, y )
                        ;
                }
            }

            var rays = {
                top: true
                ,bottom: false
                ,draw: function( ctx ){

                    Draw( ctx );

                    if ( rays.top ){
                        rayFrom( origin.pos.x, origin.pos.y - origin.radius, 'red' );
                    }

                    if ( rays.bottom ){
                        rayFrom( origin.pos.x, origin.pos.y + origin.radius, 'green' );
                    }
                }
            };

            return rays;
        }

        var Mediator = M({

            // Mediator Constructor
            constructor : function(){

                var self = this;

                this.canvasElements = [];

                self.initEvents();
                this._trueDraw = Draw.animThrottle( this._trueDraw, this );

                $(self.onDomReady.bind(this));
            }

            // Initialize events
            ,initEvents : function(){

                var self = this
                    ,clickEvent = window.Modernizr.touch ? 'touchstart' : 'click'
                    ;

                if ( window.Modernizr.touch ){
                    $(document).on({
                        'touchstart': function( e ){
                            var offset = $(this).offset();
                            e = e.originalEvent.targetTouches[0];
                            self.emit('grab', { x: e.pageX - offset.left, y: e.pageY - offset.top });
                        }
                        ,'touchmove': function( e ){
                            var offset = $(this).offset();
                            e = e.originalEvent.targetTouches[0];
                            self.emit('move', { x: e.pageX - offset.left, y: e.pageY - offset.top });
                        }
                        ,'touchend': function( e ){
                            var offset = $(this).offset();
                            self.emit('release');
                        }
                    }, '#canvas');
                } else {

                    $(document).on({
                        'mousedown': function( e ){
                            var offset = $(this).offset();
                            self.emit('grab', { x: e.pageX - offset.left, y: e.pageY - offset.top });
                        }
                        ,'mousemove': function( e ){
                            var offset = $(this).offset();
                            self.emit('move', { x: e.pageX - offset.left, y: e.pageY - offset.top });
                        }
                        ,'mouseup': function( e ){
                            var offset = $(this).offset();
                            self.emit('release');
                        }
                    }, '#canvas');
                }

                $(document).on( clickEvent, '#ctrl-top-rays', function(){
                    var $this = $(this)
                        ,active = !$this.is('.on')
                        ;

                    $this.toggleClass( 'on', active );
                    self.emit('settings:top-rays', active);
                });

                $(document).on( clickEvent, '#ctrl-bottom-rays', function(){
                    var $this = $(this)
                        ,active = !$this.is('.on')
                        ;

                    $this.toggleClass( 'on', active );
                    self.emit('settings:bottom-rays', active);
                });

                $(document).on( clickEvent, '#ctrl-reset', function(){

                    self.emit('settings:reset');
                });

                $(window).on('resize', function(){
                    self.emit('resize', { width: window.innerWidth, height: window.innerHeight });
                });
            }

            // DomReady Callback
            ,onDomReady : function(){

                var self = this
                    ,width = window.innerWidth
                    ,height = 500
                    ,canvas = $('#canvas')[0]
                    ,ctx = canvas.getContext('2d')
                    ;

                canvas.width = width;
                canvas.height = height;

                self.on('resize', function( e, dim ){
                    width = canvas.width = dim.width;
                    // height = canvas.height = 300;
                    self.draw();
                });

                this.ctx = ctx;

                // lens
                this.lens = makeLens( 0, 0, 300, 100 );
                this.draw( this.lens );

                // objective
                this.origin = {
                    pos: {
                        x: -200
                        ,y: 0
                    }
                    ,src: require.toUrl('../../images/Gangnam-style-2.png')
                    ,radius: 80
                    ,draw: function( ctx ){

                        Draw( ctx )
                            .styles()
                            .image( this.src, this.pos.x, this.pos.y, this.radius*2.2, this.radius*2.2 )
                            ;
                    }
                };

                this.makeMovable( this.origin, function( x, y, item ){
                    x -= item.pos.x;
                    y -= item.pos.y;
                    return Math.sqrt( x*x + y*y ) <= item.radius;
                });

                this.draw( this.origin );

                // screen
                this.screen = {
                    pos: {
                        x: 200
                        ,y: 0
                    }
                    ,height: 300
                    ,draw: function( ctx ){

                        var h2 = this.height / 2
                            ,x = this.pos.x
                            ,y = this.pos.y
                            ,s = 10
                            ,lines = []
                            ;

                        y -= h2;
                        for ( var i = 0; i * s < this.height; i++ ){
                            y += s;
                            lines.push([ x, y, x + 10, y - 10 ]);
                        }

                        y = this.pos.y;

                        Draw( ctx )
                            .styles( 'fillStyle', 'white' )
                            .rect( x, y - h2, x + width, y + h2 )
                            .fill()
                            .styles( screenHatchStyles )
                            .lines( lines )
                            .styles( screenStyles )
                            .line( x, y - h2, x, y + h2 )
                            ;
                    }
                };

                this.makeMovable( this.screen, function( x, y, item ){

                    var h2 = item.height/2;
                    x -= item.pos.x;
                    y -= item.pos.y;
                    return x < 15 &&
                        x > -15 &&
                        y < h2 &&
                        y > (-h2);
                });

                // rays
                this.rays = makeRays( this.lens, this.origin, this.screen );
                this.draw( this.rays );

                self.on('settings:top-rays', function( e, on ){
                    self.rays.top = on;
                    self.draw();
                }).on('settings:bottom-rays', function( e, on ){
                    self.rays.bottom = on;
                    self.draw();
                });

                this.draw( this.screen );

                // viewscreen
                this.viewscreen = {
                    ctx: $('#screen')[0].getContext('2d')
                    ,draw: function(){

                        // lens equation
                        var f = self.lens.focalDistance
                            // object dist
                            ,ox = self.lens.pos.x - self.origin.pos.x
                            // focal origin of screen
                            ,sx = (self.screen.pos.x * f)/(self.screen.pos.x - f)
                            // confusion circle
                            ,c = self.lens.height * Math.abs(sx - ox) * f / (sx * (ox - f))
                            // image dist
                            ,factor = (ox * f)/(ox - f)
                            ,oh = self.origin.radius
                            // height of the image = ratio of object/image distances plus confusion circle
                            // multiply by two because we're using the radius (half height)
                            ,h = 2 * (factor * oh / ox + c/2)
                            ,data
                            ,canvas = this.ctx.canvas
                            ;

                        Draw( this.ctx )
                            .clear()
                            .offset(0, 0)
                            .styles('fillStyle', '#fff')
                            .rect( 0, 0, canvas.width, canvas.height )
                            ;

                        this.ctx.save();
                        this.ctx.scale(-1, -1);

                        Draw.image( self.origin.src, -100, -100, h, h );

                        this.ctx.restore();

                        data = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
                        blur.filter( data, { amount: c } );
                        this.ctx.putImageData(data, 0, 0);
                    }
                };

                self.draw( this.viewscreen );

                Draw.preload( this.origin.src, function(){
                    self.draw();
                });

                self.on('settings:reset', function(){
                    self.origin.pos.x = -200;
                    self.screen.pos.x = 200;
                    self.draw();
                });
            }

            ,makeMovable: function( item, isInside ){

                var self = this;
                var canvas = self.ctx.canvas;
                var handle = {
                    radius: 20
                    ,pos: {
                        get x(){
                            return item.pos.x;
                        }
                        ,y: 200
                    }
                    ,draw: function( ctx ){

                        Draw( ctx )
                            .styles( 'strokeStyle', '#444' )
                            .line( item.pos.x, item.pos.y, item.pos.x, this.pos.y )
                            .styles( arrowStyles )
                            .rect( item.pos.x - 10, this.pos.y - 2, item.pos.x + 10, this.pos.y + 2 )
                                .fill()
                            .arrowHead( 'left', item.pos.x - 15, this.pos.y, 10 )
                                .fill()
                            .arrowHead( 'right', item.pos.x + 15, this.pos.y, 10 )
                                .fill()
                            ;
                    }
                };

                self.draw( handle );

                self.on('move', function( e, pos ){
                    var width = self.ctx.canvas.width
                        ,height = self.ctx.canvas.height
                        ;

                    if ( e.stop ){
                        return;
                    }

                    if ( isInside( pos.x - width/2, pos.y - height/2, item ) ||
                        dist( pos.x - width/2, pos.y - height/2, handle.pos.x, handle.pos.y ) <= handle.radius
                    ){
                        e.stop = true;
                        canvas.style.cursor = 'move';
                    } else {
                        canvas.style.cursor = '';
                    }
                });

                self.on('grab', function( e, pos ){

                    var width = self.ctx.canvas.width
                        ,height = self.ctx.canvas.height
                        ;

                    if ( isInside( pos.x - width/2, pos.y - height/2, item ) ||
                        dist( pos.x - width/2, pos.y - height/2, handle.pos.x, handle.pos.y ) <= handle.radius
                    ){
                        var move = function( e, pos ){
                            item.pos.x = pos.x - width/2;
                            self.draw();
                        };

                        self.on('move', move);
                        self.on('release', function( e ){
                            self.off('move', move);
                            self.off(e.topic, e.handler);
                        });
                    }
                });
            }

            ,draw: function( thing ){

                if ( thing ){
                    this.canvasElements.push( thing );
                    return;
                }

                this._trueDraw();
            }

            ,_trueDraw: function(){

                Draw( this.ctx )
                    .offset( this.ctx.canvas.width/2, this.ctx.canvas.height/2 )
                    .clear()
                    ;

                for ( var i = 0, l = this.canvasElements.length; i < l; i++ ){
                    this.canvasElements[ i ].draw( this.ctx );
                }
            }

        }, ['events']);

        return new Mediator();
    }
);
