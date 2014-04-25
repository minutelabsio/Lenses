define(
    [
        'jquery',
        'moddef',
        'modules/canvas-drawer'
    ],
    function(
        $,
        M,
        Drawer
    ) {

        'use strict';

        var colors = {
            'grey': 'rgb(220, 220, 220)'
            ,'greyDark': 'rgb(200, 200, 200)'
            ,'deepGrey': 'rgb(67, 67, 67)'
            ,'blue': 'rgb(40, 136, 228)'
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
            }
            ,pointStyles = {
                lineWidth: 1
                ,strokeStyle: colors.blue
                ,fillStyle: colors.blue
            }
            ;

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

                this.ctx = ctx;
                this.lens = makeLens( (width/2)|0, (height/2)|0, 200, 100 );
                this.draw( this.lens );

                this.origin = {
                    pos: {
                        x: width / 2 - 200
                        ,y: height / 2
                    }
                    ,radius: 50
                    ,draw: function( ctx ){
                        Drawer( ctx )
                            .styles( lensStyles )
                            .circle( this.pos.x, this.pos.y, this.radius )
                              .fill()
                            ;
                    }
                    ,isInside: function( x, y ){
                        x -= this.pos.x;
                        y -= this.pos.y;
                        return Math.sqrt( x*x + y*y ) <= this.radius;
                    }
                };

                self.on('grab', function( e, pos ){

                    if ( !self.origin.isInside( pos.x, pos.y ) ){
                        return;
                    }

                    var move = function( e, pos ){
                        self.origin.pos.x = pos.x;
                        self.draw();
                    };

                    self.on('move', move);
                    self.on('release', function( e ){
                        self.off('move', move);
                        self.off(e.topic, e.handler);
                    });
                });

                this.draw( this.origin );

                this.draw();
            }

            ,draw: function( thing ){

                if ( thing ){
                    this.canvasElements.push( thing );
                    return;
                }

                this._trueDraw();
            }

            ,_trueDraw: function(){

                Drawer( this.ctx ).clear();

                for ( var i = 0, l = this.canvasElements.length; i < l; i++ ){
                    this.canvasElements[ i ].draw( this.ctx );
                }
            }

        }, ['events']);

        return new Mediator();
    }
);
