define(['jquery', 'TEnvironment', 'TGraphicalObject', 'TUtils', 'objects/shape/Shape'], function ($, TEnvironment, TGraphicalObject, TUtils, Shape) {
    /**
     * Defines Polygon, inherited from Shape.
     * @exports Polygon
     */
    var Polygon = function () {
        Shape.call(this);
    };

    Polygon.prototype = Object.create(Shape.prototype);
    Polygon.prototype.constructor = Polygon;
    Polygon.prototype.className = "Polygon";

    var graphics = Polygon.prototype.graphics;

    Polygon.prototype.gClass = graphics.addClass("TShape", "TPolygon", {
        init: function (props, defaultProps) {
            this._super(TUtils.extend({
                vertices: [],
                initVertices: false,
                fill: false,
                type: TGraphicalObject.TYPE_POLYGON
            }, props), defaultProps);
        },
        setVertices: function (value) {
            for (var i = 0; i < value.length; i += 2) {
                this.p.vertices.push([value[i], value[i + 1]]);
            }
            this.p.initVertices = true;
        },
        draw: function (ctx) {
            var p = this.p;
            if (p.initVertices) {
                ctx.beginPath();
                ctx.moveTo(p.vertices[0][0] + p.x, p.vertices[0][1] + p.y);
                for (var i = 1; i < p.vertices.length; i++) {
                    ctx.lineTo(p.vertices[i][0] + p.x, p.vertices[i][1] + p.y);
                }
                ctx.closePath();
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.width;
                ctx.stroke();
                if (this.p.fill) {
                    ctx.fillStyle = p.fillColor;
                    ctx.fill();
                }
            }
        }
    });

    /**
     * Set vertices's coordinates. 
     */
    Polygon.prototype._setVertices = function () {
        this.gObject.setVertices(arguments);
    };

    return Polygon;
});