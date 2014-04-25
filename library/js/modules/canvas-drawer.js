define(function(){

    var Pi2 = 2 * Math.PI;
    var context;
    var Drawer = function( ctx ){

        Drawer.ctx = ctx;
        return Drawer;
    };

    Drawer.animThrottle = function( fn, scope ){
        var to
            ,call = false
            ,args
            ,cb = function(){
                window.cancelAnimationFrame( to );
                if ( call ){
                    call = false;
                    to = window.requestAnimationFrame( cb );
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
    };

    Drawer.styles = function( styles, ctx ){
        ctx = ctx || Drawer.ctx;

        for ( var prop in styles ){
            ctx[ prop ] = styles[ prop ];
        }

        return Drawer;
    };

    Drawer.circle = function( x, y, r, ctx ){
        ctx = ctx || Drawer.ctx;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Pi2, false);
        ctx.stroke();

        return Drawer;
    };

    Drawer.quadratic = function( x1, y1, x2, y2, cx, cy, ctx ){
        ctx = ctx || Drawer.ctx;
        cx = cx === undefined ? (x1+x2) * 0.5 : cx;
        cy = cy === undefined ? (y1+y2) * 0.5 : cy;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cx, cy, x2, y2);
        ctx.stroke();

        return Drawer;
    };

    Drawer.fill = function( ctx ){
        ctx = ctx || Drawer.ctx;

        ctx.fill();
        return Drawer;
    };

    Drawer.stroke = function( ctx ){
        ctx = ctx || Drawer.ctx;

        ctx.stroke();
        return Drawer;
    };

    Drawer.clear = function( ctx ){
        ctx = ctx || Drawer.ctx;
        var c = ctx.canvas;

        ctx.clearRect( 0, 0, c.width, c.height );
        return Drawer;
    };

    return Drawer;
});
