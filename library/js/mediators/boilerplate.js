define(
    [
        'require',
        'jquery',
        'moddef',
        'modules/canvas-drawer',
        'vendor/raf',
        'vendor/blur-filter',
        'vendor/tween'
    ],
    function(
        require,
        $,
        M,
        Draw,
        _raf,
        Blur,
        _tweenjs
    ) {

        'use strict';

        var TWEEN = window.TWEEN;
        var blur = new Blur();

        var colors = {
            'grey': 'rgb(220, 220, 220)'
            ,'greyLight': 'rgb(237, 237, 237)'
            ,'greyDark': 'rgb(200, 200, 200)'

            ,'deepGrey': 'rgb(67, 67, 67)'
            ,'deepGreyLight': 'rgb(98, 98, 98)'

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

            ,'orange': 'rgb(239, 132, 51)'
            ,'orangeLight': 'rgb(247, 195, 138)'
            ,'orangeDark': 'rgb(159, 80, 31)'
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
            window.console.log(arguments);
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
                lineWidth: 1
                ,strokeStyle: colors.greenDark
                ,fillStyle: colors.green
            }
            ,psyArrowStyles = {
                lineWidth: 2
                ,strokeStyle: colors.deepGreyLight
                ,fillStyle: colors.deepGreyLight
                ,font: '20px "sf_cartoonist_hand", Helvetica, Arial, sans-serif'
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

                if ( ox > (lens.pos.x - lens.focalDistance) ){
                    return;
                }

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
                top: false
                ,mid: false
                ,bottom: false
                ,draw: function( ctx ){

                    Draw( ctx );

                    if ( rays.top ){
                        rayFrom( origin.pos.x, origin.pos.y - origin.radius, 'red' );
                    }

                    if ( rays.bottom ){
                        rayFrom( origin.pos.x, origin.pos.y + origin.radius, 'green' );
                    }

                    if ( rays.mid ){
                        rayFrom( origin.pos.x, origin.pos.y - origin.radius * 0.3, 'orange' );
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
                            e.preventDefault();
                            var offset = $(this).offset();
                            e = e.originalEvent.targetTouches[0];
                            self.emit('grab', { x: e.pageX - offset.left, y: e.pageY - offset.top });
                        }
                        ,'touchmove': function( e ){
                            e.preventDefault();
                            var offset = $(this).offset();
                            e = e.originalEvent.targetTouches[0];
                            self.emit('move', { x: e.pageX - offset.left, y: e.pageY - offset.top });
                        }
                        ,'touchend': function( e ){
                            e.preventDefault();
                            var offset = $(this).offset();
                            self.emit('release');
                        }
                    }, '#canvas');
                } else {

                    $(document).on({
                        'mousedown': function( e ){
                            e.preventDefault();
                            var offset = $(this).offset();
                            self.emit('grab', { x: e.pageX - offset.left, y: e.pageY - offset.top });
                        }
                        ,'mousemove': function( e ){
                            e.preventDefault();
                            var offset = $(this).offset();
                            self.emit('move', { x: e.pageX - offset.left, y: e.pageY - offset.top });
                        }
                        ,'mouseup': function( e ){
                            e.preventDefault();
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

                $(document).on( clickEvent, '#ctrl-mid-rays', function(){
                    var $this = $(this)
                        ,active = !$this.is('.on')
                        ;

                    $this.toggleClass( 'on', active );
                    self.emit('settings:mid-rays', active);
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
                    ,height = 460
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
                        x: -width/2-50
                        ,y: 0
                    }
                    ,helptext: true
                    ,src: require.toUrl('../../images/Gangnam-style-2.png')
                    ,radius: 80
                    ,draw: function( ctx ){

                        var x = this.pos.x - 30
                            ,y = this.pos.y - this.radius - 70
                            ;

                        Draw( ctx )
                            .styles()
                            .image( this.src, this.pos.x, this.pos.y, this.radius*2.2, this.radius*2.2 )
                            .styles( psyArrowStyles )
                            .quadratic( x, y, x + 30, y + 30, x + 26, y + 2 )
                            .arrowHead( 'down', x + 29, y + 30, 5 )
                                .fill()
                            .text( 'Psy', x - 30, y + 2 )
                            ;

                        if ( this.helptext ){
                            x = this.pos.x - 140;
                            y = this.pos.y + 120;

                            Draw( ctx )
                                .styles( psyArrowStyles )
                                .text('Move me!', x+10, y)
                                .quadratic( x + 40, y - 20, x + 70, y - 50, x + 40, y - 50 )
                                .arrowHead( 'right', x + 70, y - 50, 5 )
                                    .fill()
                                ;
                        }
                    }
                };

                this.makeMovable( this.origin, function( x, y, item ){
                    x -= item.pos.x;
                    y -= item.pos.y;
                    return Math.sqrt( x*x + y*y ) <= item.radius;
                }, [-width/2+50, -80]);

                this.draw( this.origin );

                // screen
                this.screen = {
                    pos: {
                        x: width/2 + 50
                        ,y: 0
                    }
                    ,helptext: true
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

                        if ( this.helptext ){
                            x = this.pos.x + 60;
                            y = this.pos.y + 60;

                            Draw( ctx )
                                .styles( psyArrowStyles )
                                .text('Move me!', x + 10, y)
                                .quadratic( x + 40, y - 20, x - 10, y - 50, x + 40, y - 50 )
                                .arrowHead( 'left', x - 10, y - 50, 5 )
                                    .fill()
                                ;
                        }
                    }
                };

                self.on('drag', function(e){
                    self.origin.helptext = false;
                    self.screen.helptext = false;
                    self.off(e.topic, e.handler);
                });

                this.makeMovable( this.screen, function( x, y, item ){

                    var h2 = item.height/2;
                    x -= item.pos.x;
                    y -= item.pos.y;
                    return x < 15 &&
                        x > -15 &&
                        y < h2 &&
                        y > (-h2);
                }, [ 50, width/2 - 50 ]);

                // rays
                this.rays = makeRays( this.lens, this.origin, this.screen );
                this.draw( this.rays );

                self.on('settings:top-rays', function( e, on ){
                    self.rays.top = on;
                    self.draw();
                }).on('settings:mid-rays', function( e, on ){
                    self.rays.mid = on;
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
                            // confusion circle (times 0.5 fudge for UX reasons)
                            ,c = self.lens.height * Math.abs(sx - ox) * f / (sx * (ox - f)) * 0.5
                            // image dist
                            ,factor = (ox * f)/(ox - f)
                            ,oh = self.origin.radius
                            ,h
                            ,data
                            ,canvas = this.ctx.canvas
                            ;

                        if ( c < 0 || isNaN(c) ){
                            c = 200;
                        }
                        // height of the image = ratio of object/image distances plus confusion circle
                        // multiply by two because we're using the radius (half height)
                        h = 2 * (factor * oh / ox + c/2);

                        Draw( this.ctx )
                            .clear()
                            .offset(0, 0)
                            .styles('fillStyle', '#fff')
                            .rect( 0, 0, canvas.width, canvas.height )
                            ;

                        if ( c >= 200 ){
                            return;
                        }

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
                    self.emit('settings:reset', 1000);
                    setTimeout(function(){
                        self.rays.top = true;
                        self.draw();
                    }, 1000);
                });

                self.on('settings:reset', function( e, dur ){
                    var tween = new TWEEN.Tween({
                            ox: self.origin.pos.x
                            ,sx: self.screen.pos.x
                        })
                        .to({
                            ox: -200
                            ,sx: 200
                        }, dur || 500 )
                        .easing( TWEEN.Easing.Elastic.Out )
                        .onUpdate( function () {

                            self.origin.pos.x = this.ox;
                            self.screen.pos.x = this.sx;
                        })
                        ;

                    self.animate( tween );
                });
            }

            ,makeMovable: function( item, isInside, bounds ){

                var self = this;
                var canvas = self.ctx.canvas;


                bounds = bounds || [-Infinity, Infinity];

                self.on('move', function( e, pos ){
                    var width = self.ctx.canvas.width
                        ,height = self.ctx.canvas.height
                        ;

                    if ( e.stop ){
                        return;
                    }

                    if ( isInside( pos.x - width/2, pos.y - height/2, item ) ){
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

                    if ( isInside( pos.x - width/2, pos.y - height/2, item ) ){
                        var move = function( e, pos ){
                            item.pos.x = Math.max(Math.min(pos.x - width/2, bounds[1]), bounds[0]);
                            self.draw();
                            self.emit('drag', pos);
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

                this.emit('draw');
            }

            ,animate: function( tween ){

                var self = this
                    ,done = false
                    ;

                tween.onComplete(function(){
                    done = true;
                }).start();

                function draw(){
                    if ( done ){
                        return;
                    }

                    window.requestAnimationFrame( draw );
                    TWEEN.update();

                    Draw( self.ctx )
                        .offset( self.ctx.canvas.width/2, self.ctx.canvas.height/2 )
                        .clear()
                        ;

                    for ( var i = 0, l = self.canvasElements.length; i < l; i++ ){
                        self.canvasElements[ i ].draw( self.ctx );
                    }
                }

                draw();
            }

        }, ['events']);

        return new Mediator();
    }
);
