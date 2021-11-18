package com.pause9.supermegasquid;

import nape.geom.AABB;
import nape.geom.GeomPolyList;
import nape.geom.IsoFunction;
import nape.geom.Vec2;
import nape.geom.MarchingSquares;
import nape.phys.Body;
import nape.shape.Polygon;
import nape.shape.ShapeList;

class IsoBody 
{
	private static var output:GeomPolyList;
	private static var output2:GeomPolyList;
	
    public static function run(iso:IsoFunctionDef, bounds:AABB, granularity:Vec2=null, quality:Int=5, simplification:Float=1) {
        //var body = new Body()
		output = new GeomPolyList();
		output2 = new GeomPolyList();
		var shapeList:ShapeList = new ShapeList();
        if (granularity==null) granularity = Vec2.weak(8, 8);
        MarchingSquares.run(iso, bounds, granularity, quality, null, true, output);
        output.foreach(function(p) {
			p.simplify(simplification).convexDecomposition(true, output2);
			output2.foreach(function(f) {
				//body.shapes.add(new Polygon(q));
				shapeList.push(new Polygon(f));
				// Recycle GeomPoly and its vertices
				f.dispose();
			});
			output2.clear();
            p.dispose();
        });
        // Recycle list nodes
        output.clear();
        // Align body with its centre of mass.
        // Keeping track of our required graphic offset.
        //var pivot = body.localCOM.mul(-1);
        //body.translateShapes(pivot);
        //body.userData.graphicOffset = pivot;
        return shapeList;
    }
}