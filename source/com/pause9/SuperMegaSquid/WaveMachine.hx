package com.pause9.supermegasquid;

import nape.geom.AABB;
import nape.geom.GeomPoly;
import nape.geom.GeomPolyList;
import nape.phys.FluidProperties;
import nape.shape.Polygon;
import nape.shape.ShapeList;
import nme.geom.Point;
//import nme.display.Tilesheet;
import org.flixel.FlxPoint;
import nme.geom.Rectangle;
import nme.geom.Matrix;
import nape.phys.Body;
import nape.geom.MarchingSquares;
import nape.geom.IsoFunction;
import nape.dynamics.InteractionFilter;
import nape.geom.Vec2;
import nape.phys.BodyType;
import org.flixel.nape.FlxPhysState;
import nape.phys.Material;
import org.flixel.FlxG;
import nme.display.Bitmap;

//#if flash
import nme.display.Shape;
//import nme.display.BitmapData;
//import nme.display.DisplayObject;
//import nme.Lib;
//#else
//import native.display.Shape;
//import native.display.BitmapData;
//#end

//typedef IsoFunctionDef = #if flash IsoFunction #else Float->Float->Float #end;

class WaveMachine extends Shape
{
	public var wavePoints:Array<WavePoint>;
	private var midpoint:FlxPoint;
	private var iso:Dynamic;
	private var pointList:Array<Vec2>;
	private var output:GeomPolyList;
	private var fP:FluidProperties;
	private var gp:GeomPoly;
	private var pF:Polygon;
	private var currLWP:WavePoint;
	private var currRWP:WavePoint;
	private var p:Vec2;
	private var poly:Polygon;
	private var filt:InteractionFilter;
	
	public function new():Void
	{
		super();
		//trace(FlxG.
		//x = -FlxG.camera.scroll.x * FlxG.camera.zoom;
		//y = -FlxG.camera.scroll.y * FlxG.camera.zoom;
		this.scaleX = FlxG.camera.zoom; 
		this.scaleY = FlxG.camera.zoom;
		fP = new FluidProperties(5, 3);
		//FlxG.log(fP.gravity);
		fP.gravity = new Vec2(0, 1690);
		pointList = new Array<Vec2>();
		output = new GeomPolyList();
		midpoint = new FlxPoint(0,0);
		filt = new InteractionFilter(0, 0,1, -1);
		wavePoints = new Array<WavePoint>();
		
		//Set up wave points.
		var newWP:WavePoint;
		for (i in 0...46)
		{
			newWP = new WavePoint(i * 200, Math.ceil(Math.random() * 10 + 1500));
			wavePoints.push(newWP);
		}
		//bitmap = new Bitmap(napeBits);
		/*#if flash
			iso = new MyIso(napeBits,alphaThreshold,test);
		#else
			iso = march;
		#end*/
		createWaves();
	}
	public function update():Void
	{
		/*else
		{
			Registry.player.body.velocity.x -= 6;
		}*/
		manWaves();
		//trace(Registry.waveSprite.shapes.length);
	}
	private function createWaves():Void
	{
		for (i in 0...wavePoints.length-1)
		{
			var wP:WavePoint = wavePoints[i];
			var waveShape:Polygon = new Polygon([Vec2.weak(wP.x, wP.y), Vec2.weak(wavePoints[i + 1].x, wavePoints[i + 1].y), Vec2.weak(wavePoints[i + 1].x, 1700), Vec2.weak(wP.x, 1700)]);
			//var waveShape:Polygon = new Polygon([  Vec2.weak( 0, 1700)   ,  Vec2.weak( 8697, 1700)   ,  Vec2.weak(8697, 3000)   ,  Vec2.weak(0, 3000)  ]);
			waveShape.fluidEnabled = true;
			waveShape.material.density = 5;
			waveShape.fluidProperties = fP;
			Registry.waveSprite.shapes.push(waveShape);
		}
		var poly:Polygon = new Polygon([  Vec2.weak( 0, 1700)   ,  Vec2.weak( 8697, 1700)   ,  Vec2.weak(8697, 3000)   ,  Vec2.weak(0, 3000)  ]);
		poly.material.density = 5;
		poly.fluidEnabled = true;
		poly.fluidProperties = fP;
		Registry.waveSprite.shapes.push(poly);
		Registry.waveSprite.setShapeFilters(filt);
		//Registry.waveSprite.type = BodyType.STATIC;
	}
	private function manWaves():Void
	{
		this.x = FlxG.camera.scroll.x* -FlxG.camera.zoom; //* FlxG.camera.zoom;
		this.y = FlxG.camera.scroll.y* -FlxG.camera.zoom; //* FlxG.camera.zoom;
		//Determine visible wavePoints
		p = Vec2.weak(FlxG.camera.scroll.x, 0);
		var lWP:Int=Std.int(p.x/200);
		
		p.x=FlxG.camera.scroll.x  + FlxG.width;
		var rWP:Int=Std.int(p.x/200) + 1;
		if (lWP<0)
		{
			lWP=0;
		}
		if (rWP>wavePoints.length-1)
		{
			rWP = wavePoints.length - 1;
		}
		currLWP = wavePoints[lWP];
		currRWP = wavePoints[rWP];
		graphics.clear();
		graphics.beginFill(0x268cda, .64);
		graphics.drawCircle(0, 0, 20);
		//graphics.lineStyle(4, 0x268cda, 1);
		if (FlxG.camera.scroll.y < 1700)
		{
			graphics.moveTo(currLWP.x, currLWP.y);
		}
		else
		{
			//FlxG.log(FlxG.camera.scroll.x);
			graphics.moveTo(FlxG.camera.scroll.x , FlxG.camera.scroll.y );
		}
		
		//Adjust Wavepoints
		var a:Float = 0;
		var wP:WavePoint;
		//graphics.clear();
		//graphics.beginFill(0xFFFFFF);
		for (i in lWP-1...rWP+1)
		{
			if (i > 0 && i < wavePoints.length -1)
			{
				wP = wavePoints[i];
				a=wP.startPoint+(Math.sin(wP.angle)*wP.range);
				wP.angle+=wP.inc;
				wP.y = a;
			}
			//graphics.drawCircle(wP.x, wP.y, 10);
		}
		//graphics.endFill();
		
		//Modify Surface Shapes
		var j:Int = 0;
		var shap:Polygon;
		//var poly:Polygon;
		//Registry.waveSprite.space = null;
		if (FlxG.camera.scroll.y < 1700)
		{
			Registry.waveSprite.shapes.foreach(function (shp:nape.shape.Shape) {
				//FlxG.log(rWP);
				if (j >= lWP && j <= rWP)
				{
					//FlxG.log(j);
					if (shp.area < 70000)
					{
						//poly = shp.castPolygon;
						/*poly.localVerts.foreach(function(vert) {
							if (vert.y == wavePoints[j].x && vert.y < 1700)
							{
								vert.y = wavePoints[j].y;
							}
							else if (vert.x == wavePoints[j + 1].x && vert.y < 1700)
							{
								vert.y = wavePoints[j + 1].y;
							}
						});*/
						//poly.localVerts.clear();
						//poly.localVerts.add(Vec2.weak(wavePoints[j].x, wavePoints[j].y));
						//poly.localVerts.add(Vec2.weak(wavePoints[j + 1].x, wavePoints[j + 1].y));
						//poly.localVerts.add(Vec2.weak(wavePoints[j + 1].x, 1700));
						//poly.localVerts.add(Vec2.weak(wavePoints[j].x, 1700));
						//poly.localVerts.at(0) = Vec2.weak(wavePoints[j].x, wavePoints[j].y);
						//poly.localVerts.at(1) = Vec2.weak(wavePoints[j + 1].x, wavePoints[j + 1].y);
						shap = shp.castPolygon;
						shap.localVerts.at(0).y = wavePoints[j].y;
						shap.localVerts.at(1).y = wavePoints[j + 1].y;
						graphics.lineTo(wavePoints[j].x, wavePoints[j].y);
					}
				}
				j ++;
			});
		}
		//Registry.waveSprite.space = FlxPhysState.space;
		//Sprite Graphics Ending
		if (FlxG.camera.scroll.y < 1700)
		{
			var bottom:Float = FlxG.camera.scroll.y+FlxG.height;
			if (bottom < currLWP.y + 100)
			{
				bottom = currLWP.y + 100;
			}
			graphics.lineTo(currRWP.x, bottom);
			graphics.lineTo(currLWP.x, bottom);
			graphics.lineTo(currLWP.x, currLWP.y);
		}
		else
		{
			graphics.lineTo(FlxG.camera.scroll.x  + FlxG.width, FlxG.camera.scroll.y );
			graphics.lineTo(FlxG.camera.scroll.x  + FlxG.width, FlxG.camera.scroll.y  + FlxG.height);
			graphics.lineTo(FlxG.camera.scroll.x, FlxG.camera.scroll.y  + FlxG.height);
		}
		graphics.endFill();
	}
	/*public function manageWaves():Void 
	{
		//Figure out leftmost visible wavePoint.
		p = Vec2.weak(FlxG.camera.scroll.x, 0);
		var lWP:Int=Math.floor(p.x/100);
		//Figure out rightmost visible wavePoint.
		var rWP:Int=Math.ceil(p.x/100);
		if (lWP<0)
		{
			lWP=0;
		}
		if (rWP>wavePoints.length-1)
		{
			rWP = wavePoints.length - 1;
		}
		//time=getTimer();
		currLWP = wavePoints[lWP];
		currRWP = wavePoints[rWP];
		
		if (Registry.waveSprite.shapes != null)
		{
			Registry.waveSprite.shapes.foreach(function(shp) {
				shp.castPolygon.localVerts.clear();
				shp = null;
			});
			Registry.waveSprite.space = null;
			Registry.waveSprite.shapes.clear();
		}
		graphics.clear();
		graphics.beginFill(0x268cda,.64);
		//graphics.lineStyle(4, 0x268cda, 1);
		if (FlxG.camera.scroll.y < 1700)
		{
			graphics.moveTo(currLWP.x, currLWP.y);
		}
		else
		{
			graphics.moveTo(FlxG.camera.scroll.x, FlxG.camera.scroll.y);
		}
		
		var a:Float = 0;
		//var P0:Vec2 = Vec2.weak(0,0);
		//var P1:Vec2 = Vec2.weak(0,0);
		//var P2:Vec2 = Vec2.weak(0,0);
		//var t:Float = 0;
		//pointList.push(Vec2.weak(wavePoints[0].x, wavePoints[0].y));
		var count:Int = 0;
		var wP:WavePoint;
		for (i in 1...wavePoints.length)
		{
			//if (i < wavePoints.length-1)
			//{
			//FlxG.log(i);
			//FlxG.log(wavePoints.length - 1);
			wP = wavePoints[i];
			if (i >= lWP && i <= rWP)
			{
				count ++;
				a=wP.startPoint+(Math.sin(wP.angle)*wP.range);
				wP.angle+=wP.inc;
				wP.y = a;
				pointList.push(Vec2.weak(wP.x, wP.y));
				//graphics.drawCircle(wavePoints[i].x, wavePoints[i].y, 10);
				//midpoint.x = (wavePoints[i].x + wavePoints[i-1].x) / 2;
				//midpoint.y = (wavePoints[i].y + wavePoints[i-1].y) / 2;
				//graphics.curveTo(wavePoints[i+1].x, wavePoints[i+1].y, midpoint.x, midpoint.y);
				//graphics.lineTo(wavePoints[i].x, wavePoints[i].y);
				
				//p.x = p.y = 0;
				//P0.x = wavePoints[i-1].x;
				//P0.y = wavePoints[i-1].y;
				//P1.x = midpoint.x;
				//P1.y = midpoint.y;
				//P2.x = wavePoints[i].x;
				//P2.y = wavePoints[i].y;
				
				//Curve Point 1
				//t = .33;
				//p.x = ((1 - t) * (1 - t)) * P0.x + 2 * (1 - t) * t * P1.x + (t * t) * P2.x; 
				//p.y = ((1 - t) * (1 - t)) * P0.y + 2 * (1 - t) * t * P1.y + (t * t) * P2.y;
				//graphics.lineTo(p.x, p.y);
				//graphics.drawCircle(p.x, p.y, 10);
				//pointList.push(Vec2.weak(p.x, p.y));
				//pointList.push(Vec2.get(p.x, 2000, true));
				//pointList.push(Vec2.get(p.x, p.y, true));
				
				//Curve Point 2
				//t = .66;
				//p.x = ((1 - t) * (1 - t)) * P0.x + 2 * (1 - t) * t * P1.x + (t * t) * P2.x; 
				//p.y = ((1 - t) * (1 - t)) * P0.y + 2 * (1 - t) * t * P1.y + (t * t) * P2.y;
				//graphics.lineTo(p.x, p.y);
				//graphics.drawCircle(p.x, p.y, 10);
				//pointList.push(Vec2.weak(p.x, p.y));
				
				//pointList.push(Vec2.weak(wavePoints[i].x, wavePoints[i].y));
				//graphics.drawCircle(wavePoints[i].x, wavePoints[i].y, 10);
				//graphics.lineTo(wavePoints[i+1].x, wavePoints[i+1].y);
				if (i >= lWP && i <= rWP && FlxG.camera.scroll.y < 1700)
				{
					//graphics.lineTo(pointList[pointList.length - 4].x, pointList[pointList.length - 4].y);
					//graphics.lineTo(pointList[pointList.length - 3].x, pointList[pointList.length - 3].y);
					//graphics.lineTo(pointList[pointList.length - 2].x, pointList[pointList.length - 2].y);
					graphics.lineTo(pointList[pointList.length - 1].x, pointList[pointList.length - 1].y);
				}
				if (count == 1 || i == rWP)
				{
					//FlxG.log(count);
					//graphics.drawCircle(pointList[pointList.length - 1].x, 1200, 10);
					pointList.push(Vec2.weak(pointList[pointList.length - 1].x, 1700));
					//graphics.drawCircle(pointList[0].x, 1200, 10);
					pointList.push(Vec2.weak(pointList[0].x, 1700));
					gp = GeomPoly.get(pointList);
					gp.convexDecomposition(false, output);
					output.foreach(function(q) {
						pF = new Polygon(q);
						pF.fluidEnabled = true;
						pF.material.density = 5;
						pF.fluidProperties = fP;
						Registry.waveSprite.shapes.add(pF);
						// Recycle GeomPoly and its vertices
						q.dispose();
					});
					output.clear();
					gp.dispose();
					pointList.splice(0, pointList.length);
					pointList.push(Vec2.weak(wP.x, wP.y));
					count = 0;
				}
			}
		}
		pointList.splice(0, pointList.length);
		//FlxG.log(Registry.waveSprite.shapes.length);
		if (lWP > 0)
		{
			//Left Surface Piece
			poly = new Polygon([  Vec2.weak( wavePoints[0].x, wavePoints[0].y)   ,  Vec2.weak( currLWP.x, currLWP.y)   ,  Vec2.weak(currLWP.x, 1700)   ,  Vec2.weak(wavePoints[0].x, 1700)  ]);
			poly.material.density = 5;
			poly.fluidEnabled = true;
			poly.fluidProperties = fP;
			Registry.waveSprite.shapes.add(poly);
		}
		if (rWP < wavePoints.length-1)
		{
			//Right Surface Piece
			poly = new Polygon([  Vec2.weak( currRWP.x, currRWP.y)   ,  Vec2.weak( wavePoints[wavePoints.length-1].x, wavePoints[wavePoints.length-1].y)   ,  Vec2.weak(wavePoints[wavePoints.length-1].x, 1700)   ,  Vec2.weak(currRWP.x, 1700)  ]);
			poly.material.density = 5;
			poly.fluidEnabled = true;
			poly.fluidProperties = fP;
			Registry.waveSprite.shapes.add(poly);
		}
		//Bottom Piece
		poly = new Polygon([  Vec2.weak( 0, 1700)   ,  Vec2.weak( 8697, 1700)   ,  Vec2.weak(8697, 3000)   ,  Vec2.weak(0, 3000)  ]);
		poly.material.density = 5;
		poly.fluidEnabled = true;
		poly.fluidProperties = fP;
		Registry.waveSprite.shapes.add(poly);
		//var filt:InteractionFilter = new InteractionFilter(0, 0, 1, -1);
		Registry.waveSprite.setShapeFilters(filt);
		Registry.waveSprite.space = FlxPhysState.space;
		//Sprite Graphics Ending
		if (FlxG.camera.scroll.y < 1700)
		{
			var bottom:Float = FlxG.camera.scroll.y+FlxG.height;
			if (bottom < currLWP.y + 100)
			{
				bottom = currLWP.y + 100;
			}
			graphics.lineTo(currRWP.x, bottom);
			graphics.lineTo(currLWP.x, bottom);
			graphics.lineTo(currLWP.x, currLWP.y);
		}
		else
		{
			graphics.lineTo(FlxG.camera.scroll.x + FlxG.width, FlxG.camera.scroll.y);
			graphics.lineTo(FlxG.camera.scroll.x + FlxG.width, FlxG.camera.scroll.y + FlxG.height);
			graphics.lineTo(FlxG.camera.scroll.x, FlxG.camera.scroll.y + FlxG.height);
		}
		graphics.endFill();
	}*/
}