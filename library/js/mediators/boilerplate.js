define(
    [
        'jquery',
        'moddef',
        'modules/canvas-drawer',
        'vendor/raf'
    ],
    function(
        $,
        M,
        Drawer,
        _raf
    ) {

        'use strict';

        var colors = {
            'grey': 'rgb(220, 220, 220)'
            ,'greyDark': 'rgb(200, 200, 200)'
            ,'deepGrey': 'rgb(67, 67, 67)'
            ,'blue': 'rgb(40, 136, 228)'
            ,'green': 'rgb(121, 229, 0)'
            ,'red': 'rgb(233, 63, 51)'
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
                ,strokeStyle: colors.deepGrey
                ,shadowBlur: 1
                ,shadowColor: colors.deepGrey
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

                    Drawer( ctx )
                        .styles( lensStyles )
                        // left side
                        .quadratic( x, y - h2, x, y + h2, x - f * 0.4, y )
                        // right side
                        .quadratic( x, y - h2, x, y + h2, x + f * 0.4, y )
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

            function rayFrom( ox, oy ){

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

                Drawer
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

                Drawer
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
                    Drawer
                        .line( ox, oy, lens.pos.x - lens.focalDistance, lens.pos.y, l )
                        .line( lens.pos.x, y, lens.pos.x + 1000, y )
                        ;
                }
            }

            var rays = {
                top: true
                ,bottom: true
                ,draw: function( ctx ){

                    Drawer( ctx ).styles( 'strokeStyle', colors.red );

                    if ( rays.top ){
                        rayFrom( origin.pos.x, origin.pos.y - origin.radius );
                    }

                    if ( rays.bottom ){
                        rayFrom( origin.pos.x, origin.pos.y + origin.radius );
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
                this._trueDraw = Drawer.animThrottle( this._trueDraw, this );

                $(self.onDomReady.bind(this));
            }

            // Initialize events
            ,initEvents : function(){

                var self = this;

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
                        self.emit('release', { x: e.pageX - offset.left, y: e.pageY - offset.top });
                    }
                }, '#canvas');

                $(window).on('resize', function(){
                    self.emit('resize', { width: window.innerWidth, height: window.innerHeight });
                });
            }

            // DomReady Callback
            ,onDomReady : function(){

                var self = this
                    ,width = window.innerWidth
                    ,height = window.innerHeight
                    ,canvas = $('#canvas')[0]
                    ,ctx = canvas.getContext('2d')
                    ;

                canvas.width = width;
                canvas.height = height;

                self.on('resize', function( e, dim ){
                    width = canvas.width = dim.width;
                    height = canvas.height = dim.height;
                    self.draw();
                });

                this.ctx = ctx;

                // lens
                this.lens = makeLens( 0, 0, 200, 100 );
                this.draw( this.lens );

                // objective
                this.origin = {
                    pos: {
                        x: -200
                        ,y: 0
                    }
                    ,radius: 50
                    ,draw: function( ctx ){
                        Drawer( ctx )
                            .styles( lensStyles )
                            .circle( this.pos.x, this.pos.y, this.radius )
                              .fill()
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
                    ,height: 200
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

                        Drawer( ctx )
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

                this.draw( this.screen );

                this.draw();
            }

            ,makeMovable: function( item, isInside ){

                var self = this;
                var canvas = self.ctx.canvas;

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

                    if ( !isInside( pos.x - width/2, pos.y - height/2, item ) ){
                        return;
                    }

                    var move = function( e, pos ){
                        item.pos.x = pos.x - width/2;
                        self.draw();
                    };

                    self.on('move', move);
                    self.on('release', function( e ){
                        self.off('move', move);
                        self.off(e.topic, e.handler);
                    });
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

                Drawer( this.ctx )
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
