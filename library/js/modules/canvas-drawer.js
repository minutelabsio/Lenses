define(function(){

    var Pi2 = 2 * Math.PI;
    var context;
    var Drawer = function( ctx ){

        Drawer.ctx = ctx;
        return Drawer;
    };

    Drawer.defaultStyles = {
        lineWidth: 1
        ,strokeStyle: 'black'
        ,fillStyle: 'black'
        ,shadowBlur: 0
        ,shadowColor: 'rgba(0,0,0,0)'
        ,lineCap: 'square'
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

    Drawer.styles = function( styles, val, ctx ){

        var defs = Drawer.defaultStyles
            ,str = typeof styles === 'string'
            ,prop
            ;

        ctx = (str ? ctx : val) || Drawer.ctx;

        // resets
        for ( prop in defs ){
            ctx[ prop ] = defs[ prop ];
        }

        if ( str ){

            ctx[ styles ] = val;

        } else {
            for ( prop in styles ){
                ctx[ prop ] = styles[ prop ];
            }
        }

        return Drawer;
    };

    Drawer.line = function( x, y, x2, y2, length, ctx ){

        var len = typeof length === 'number'
            ,n
            ;

        ctx = (len ? ctx : length) || Drawer.ctx;

        ctx.beginPath();
        ctx.moveTo(x, y);

        // including length
        if ( len ){
            x2 -= x;
            y2 -= y;
            n = Math.sqrt( x2*x2 + y2*y2 );
            length /= n;
            ctx.lineTo( x2 * length + x, y2 * length + y );
        } else {
            ctx.lineTo(x2, y2);
        }

        ctx.stroke();

        return Drawer;
    };

    Drawer.lines = function( points, ctx ){
        ctx = ctx || Drawer.ctx;

        var i, p, l = points.length;
        ctx.beginPath();

        for ( i = 0; i < l; i++ ){
            p = points[ i ];
            ctx.moveTo( p[0], p[1] );
            ctx.lineTo( p[2], p[3] );
        }

        ctx.stroke();

        return Drawer;
    };

    Drawer.circle = function( x, y, r, ctx ){
        ctx = ctx || Drawer.ctx;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Pi2, false);
        ctx.stroke();

        return Drawer;
    };

    Drawer.rect = function( x, y, x2, y2, ctx ){
        ctx = ctx || Drawer.ctx;

        ctx.fillRect( x, y, x2-x, y2-y );

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
