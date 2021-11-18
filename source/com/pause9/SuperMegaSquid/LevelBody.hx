package com.pause9.supermegasquid;

import nape.phys.Material;
import nme.geom.Matrix;
import org.flixel.FlxG;
import nme.display.BitmapData;
import org.flixel.FlxSprite;
import nape.geom.AABB;
import nape.geom.GeomPoly;
import nape.geom.IsoFunction;
import nape.geom.MarchingSquares;
import nape.geom.Vec2;
import nape.phys.Body;
import nape.phys.BodyType;
import nape.shape.Polygon;
import nme.display.DisplayObject;
import nape.dynamics.InteractionFilter;
import nme.Assets;
import nme.geom.Rectangle;
import nme.geom.Point;
import nape.shape.ShapeList;
import nme.display.Bitmap;
import org.flixel.nape.FlxPhysState;

//@:bitmap("assets/shell1.png") class LBit extends flash.display.BitmapData {}

class LevelBody extends FlxSprite
{
	//public var levelBody:Body;
	//public var levelBody2:Body;
	//public var levelBody3:Body;
	//public var levelBody4:Body;
	//public var levelBody5:Body;
	//public var levelBody6:Body;
	//public var levelBody7:Body;
	//public var levelBody8:Body;
	//public var levelBody9:Body;
	private var iso:IsoFunctionDef;
	private var alphaThreshold:Int;
	private var num:Int;
	private var bit:BitmapData;
	public var bodies:Array<Body>;
	
	public function new(x:Int,y:Int)
	{
		super(x, y);
		alphaThreshold = 0x80;
		//bits = new Array<BitmapData>();
		//bit = new BitmapData(1000,1500,true,0x00000000);
		//bits = new BitmapData(1400, 2000, true, 0x00000000);
		num = 0;
		#if !flash
			iso = march;
		#end
		//createBody();
	}
	public function createBodies(bgs:Array<FlxSprite>):Void
	{
		var simp:Int = 4;
		var qual:Int = 1;
		var gran:Vec2 = Vec2.get(10, 10);
		var levelBody:Body;
		var shapeTotal:Int = 0;
		var levelFilter:InteractionFilter = new InteractionFilter(2, -1, 1, -1, 0, 0);
		bodies = new Array<Body>();
		for (i in 0...bgs.length)
		{
			
			//Create Body
			bit = bgs[i].pixels;
			#if flash
				iso = new MyIso(bit, 0x80);
			#end
			var shapeList:ShapeList = IsoBody.run(iso, new AABB( 0, 0, bgs[i].width, bgs[i].height), gran, qual, simp);
			levelBody = new Body();
			shapeList.foreach(function(shp){
				levelBody.shapes.add(shp);
				shp = null;
			});
			shapeList.clear();
			levelBody.position.setxy(bgs[i].x, bgs[i].y);
			levelBody.type = BodyType.STATIC;
			levelBody.space = FlxPhysState.space;
			levelBody.cbTypes.add(Registry.TERRAIN);
			
			//Testing
			shapeTotal += levelBody.shapes.length;
			//FlxG.log(levelBody.shapes.length);
			
			//Set interaction filters
			levelBody.setShapeFilters(levelFilter);
			bodies.push(levelBody);
			bit = null;
			
		}
		//FlxG.log(shapeTotal);
		//FlxG.log(bodies[0]);
	}	
	private function march(x:Float,y:Float):Float
	{
		var ix = Std.int(x); var iy = Std.int(y);
		//var currBit:BitmapData = Registry.levelBG.bits[num]
        //clamp in-case of numerical inaccuracies
        if(ix<0) ix = 0; if(iy<0) iy = 0;
        if(ix>=bit.width)  ix = bit.width-1;
        if(iy>=bit.height) iy = bit.height-1;
        // iso-function values at each pixel centre.
        var a11 = alphaThreshold - (bit.getPixel32(ix,iy)>>>24);
        var a12 = alphaThreshold - (bit.getPixel32(ix+1,iy)>>>24);
        var a21 = alphaThreshold - (bit.getPixel32(ix,iy+1)>>>24);
        var a22 = alphaThreshold - (bit.getPixel32(ix+1,iy+1)>>>24);
        // Bilinear interpolation for sample point (x,y)
        var fx = x - ix; var fy = y - iy;
        return a11*(1-fx)*(1-fy) + a12*fx*(1-fy) + a21*(1-fx)*fy + a22*fx*fy;
	}
}

#if flash
class MyIso implements IsoFunction 
{
	public var bitmap:BitmapData;
    public var alphaThreshold:Float;
	public var bounds:AABB;
	public function new(bitmap:BitmapData, alphaThreshold:Float = 0x80) {
    this.bitmap = bitmap;
    this.alphaThreshold = alphaThreshold;
    bounds = new AABB(0, 0, bitmap.width, bitmap.height);
    }
    public function graphic() {
        return new Bitmap(bitmap);
    }
    public function iso(x:Float, y:Float) {
        // Take 4 nearest pixels to interpolate linearly.
        // This gives us a smooth iso-function for which
        // we can use a lower quality in MarchingSquares for
        // the root finding.
        var ix = Std.int(x); var iy = Std.int(y);
        //clamp in-case of numerical inaccuracies
        if(ix<0) ix = 0; if(iy<0) iy = 0;
        if(ix>=bitmap.width)  ix = bitmap.width-1;
        if(iy>=bitmap.height) iy = bitmap.height-1;
        // iso-function values at each pixel centre.
        var a11 = alphaThreshold - (bitmap.getPixel32(ix,iy)>>>24);
        var a12 = alphaThreshold - (bitmap.getPixel32(ix+1,iy)>>>24);
        var a21 = alphaThreshold - (bitmap.getPixel32(ix,iy+1)>>>24);
        var a22 = alphaThreshold - (bitmap.getPixel32(ix+1,iy+1)>>>24);
        // Bilinear interpolation for sample point (x,y)
        var fx = x - ix; var fy = y - iy;
        return a11*(1-fx)*(1-fy) + a12*fx*(1-fy) + a21*(1-fx)*fy + a22*fx*fy;
    }
}
#end