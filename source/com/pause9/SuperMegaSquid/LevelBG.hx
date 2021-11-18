package com.pause9.supermegasquid;

import nme.geom.Matrix;
import nme.geom.Point;
import nme.geom.Rectangle;
import org.flixel.FlxGroup;
import nme.display.BitmapData;
import org.flixel.FlxSprite;
import nme.Assets;
import org.flixel.FlxG;
import org.flixel.system.layer.Atlas;

class LevelBG extends FlxGroup
{
	public var bgs:Array<FlxSprite>;
	private var bigBit:BitmapData;
	private var skyslice:BitmapData;
	public var parallaxBGS:FlxGroup;
	public var skyBG:FlxGroup;
	//public var skyBG1:FlxSprite;
	//public var skyBG2:FlxSprite;
	
	public function new()
	{
		super();
		
		create();
	}
	public function create():Void
	{
		skyBG = new FlxGroup();
		skyslice = Assets.getBitmapData("assets/skyslice2.png");
	}
	override public function update():Void
	{
		super.update();
		displayProperBG();
	}
	private function displayProperBG():Void
	{
		//Just checking if you're in viewing range (x axis only) of a given BG tile and hiding or showing it.
		for (i in 0...bgs.length)
		{
			var bg:FlxSprite = bgs[i];
			//Check X Distance
			//FlxG.log(FlxG.camera.scroll.x - bgs[2].x);
			//FlxG.log( -bgs[2].width);
			//Registry.water.graphics.beginFill(0xFFFFFFFF);
			//Registry.water.graphics.drawCircle(bg.x, 2800, 35);
			//Registry.water.graphics.endFill();
			if (Math.abs(Registry.player.x - (bg.x + bg.width/2)) < bg.width + 5)
			{
				//bg.visible = true;
				//FlxG.log(i);
				if (!bg.visible)
				{
					//FlxG.log(i);
					bg.visible = true;
				}
			}
			else
			{
				if (bg.exists)
				{
					bg.visible = false;
				}
			}
		}
	}
	public function createWorldPhysics():Void
	{
		bigBit = Assets.getBitmapData("assets/worldpixel.png", false);
		var colWidth:Int = 2000;
		var rowHeight:Int = 1500;
		var rect:Rectangle = new Rectangle(0, 0, colWidth, rowHeight);
		bgs = new Array<FlxSprite>();
		var bit:BitmapData;
		var bg:FlxSprite;
		var p:Point = new Point(0, 0);
		//var newAtlas:Atlas;
		var num:Int = 0;
		//Cut the world bitmap into a grid of 2 rows, 5 columns. Draw each grid onto a new bitmapdata and assign it to a newly created flxsprite.
		for (i in 0...4)
		{
			rect.y = 0;
			for (j in 0...2)
			{
				var newAtlas = FlxG.state.createAtlas("bgAtlas" + Std.string(num), colWidth, rowHeight);
				num ++;
				//bit.lock();
				//bit.copyPixels(bigBit, rect, p, null, null, true);
				//bit.unlock();
				bg = new FlxSprite(i * colWidth, j * rowHeight);
				bg.pixels = new BitmapData(colWidth, rowHeight, true, 0x00000000);
				bg.pixels.copyPixels(bigBit, rect, p, null, null, true);
				//bg.updateAtlasInfo(false);
				#if (cpp || neko)
					bg.atlas = newAtlas;
				#end
				bgs.push(bg);
				//add(bg);
				bg.solid = false;
				bg.active = false;
				bg.visible = false;
				rect.y += rowHeight;
			}
			rect.x += colWidth;
		}
		//Odd End
		var newAtlas = FlxG.state.createAtlas("bgAtlas_odd" + Std.string(num), 1400, 1500);
		for (j in 0...2)
		{
			num++;
			rect = new Rectangle(colWidth*4, j*rowHeight, bigBit.width - colWidth*4, rowHeight);
			//bit.lock();
			//bit.unlock();
			bg = new FlxSprite(4 * colWidth, j * rowHeight);
			bg.pixels = new BitmapData(bigBit.width - colWidth * 4, rowHeight, true, 0x00000000);
			bg.pixels.copyPixels(bigBit, rect, p, null, null, true);
			//bg.updateAtlasInfo(true);
			//bg.pixels = bit;
			#if (cpp || neko)
				bg.atlas = newAtlas;
			#end
			//FlxG.log(Registry.myAtlas.width);
			bgs.push(bg);
			//add(bg);
			bg.solid = false;
			bg.active = false;
			bg.visible = false;
			//rect.y += rowHeight;
		}
		
		Registry.levelBody.createBodies(bgs);
	}
	public function compositeBG():Void
	{
		//Composite Bitmap
		var bigVeggies:BitmapData = Assets.getBitmapData("assets/veggiespixel.png", false);
		var colWidth:Int = 2000;
		var rowHeight:Int = 1500;
		var num:Int = 0;
		var p:Point = new Point(0, 0);
		var rect:Rectangle = new Rectangle(0, 0, colWidth, rowHeight);
		//Sky
		//skyBG1 = new FlxSprite(0, 0);
		//skyBG1.active = false;
		//skyBG1.pixels = new BitmapData(FlxG.width, 1500, false, 0xFFFFFFFF);
		//skyBG1.scrollFactor.x = 0;
		//skyBG2 = new FlxSprite(0, 1500);
		//skyBG2.active = false;
		var skyRect:Rectangle = new Rectangle(0, 0, 1, 1500);
		var skySlice1 = new BitmapData(10, 1500, false, 0xFFFFFFFF);
		//skySlice1.copyPixels(skyslice, skyRect, new Point(j, 0), null, null, false);
		var skySlice2 = new BitmapData(10, 1500, false, 0xFFFFFFFF);
		//skySlice2.copyPixels(skyslice, skyRect, new Point(j, 0), null, null, false);
		for (j in 0...10)
		{
			//var skyBG = new FlxSprite(0, 0);
			skyRect.y = 0;
			skySlice1.copyPixels(skyslice, skyRect, new Point(j, 0), null, null, false);
			skyRect.y = 1500;
			skySlice2.copyPixels(skyslice, skyRect, new Point(j, 0), null, null, false);
			//skybits2.copyPixels(skyslice, new Rectangle(0, 1500, 1, 1500), new Point(i, 0), null, null, false);
		}
		//skyBG2.pixels = new BitmapData(FlxG.width, 1500, false, 0xFFFFFFFF);
		//skyBG2.scrollFactor.x = 0;
		var skyBG1:FlxSprite;
		var skyBG2:FlxSprite;
		for (g in 0...Math.ceil(FlxG.width/10))
		{
			skyBG1 = new FlxSprite(g*10, 0);
			skyBG1.active = false;
			skyBG1.solid = false;
			skyBG1.pixels = skySlice1;
			skyBG1.scrollFactor.x = 0;
			skyBG2 = new FlxSprite(g*10, 1500);
			skyBG2.active = false;
			skyBG2.solid = false;
			skyBG2.pixels = skySlice2;
			skyBG2.scrollFactor.x = 0;
			/*for (j in 0...10)
			{
				//var skyBG = new FlxSprite(0, 0);
				skyRect.y = 0;
				skyBG1.pixels.copyPixels(skyslice, skyRect, new Point(j, 0), null, null, false);
				skyRect.y = 1500;
				skyBG2.pixels.copyPixels(skyslice, skyRect, new Point(j, 0), null, null, false);
				//skybits2.copyPixels(skyslice, new Rectangle(0, 1500, 1, 1500), new Point(i, 0), null, null, false);
			}*/
			#if (cpp || neko)
			skyBG1.atlas = Registry.myAtlas;
			skyBG2.atlas = Registry.myAtlas;
			#end
			skyBG.add(skyBG1);
			skyBG.add(skyBG2);
		}
		//var newAtlas:Atlas;
		//#if (cpp || neko)
			//newAtlas = FlxG.state.createAtlas("skyAtlas", FlxG.width, 1500);
			//skyBG1.atlas = Registry.myAtlas;
			//newAtlas = FlxG.state.createAtlas("skyAtlas2", FlxG.width, 1500);
			//skyBG2.atlas = Registry.myAtlas;
		//#end
		//add(skyBG1);
		//add(skyBG2);
		//Parallax BG
		parallaxBGS = new FlxGroup(4);
		//var newAtlas:Atlas;
		for (i in 0...4)
		{
			var para:FlxSprite = new FlxSprite(i * 2000, 3000 - 496, "assets/scrollingbg2.png");
			para.active = false;
			para.solid = false;
			#if (cpp || neko)
				para.atlas = Registry.myAtlas;
			#end
			para.scrollFactor.x = .65;
			parallaxBGS.add(para);
		}
		//Terrain
		var rect:Rectangle = new Rectangle(0, 0, colWidth, rowHeight);
		//var newAtlas:Atlas;
		for (i in 0...4)
		{
			rect.y = 0;
			for (j in 0...2)
			{
				//bit = new BitmapData(colWidth, rowHeight, false, 0xFFFFFFFF);
				//bgs[num].pixels.fillRect(bgs[num].pixels.rect, 0x00000000);
				//Draw Sky
				//var slices:Int = Std.int(FlxG.width);
				
				
				//Draw Terrain
				//bgs[num].pixels.copyPixels(bigBit, rect, p, null, null, true);
				//bgs[i * 2 + j].pixels.lock();
				bgs[i * 2 + j].pixels.copyPixels(bigVeggies, rect, p, null, null, true);
				//bgs[i * 2 + j].pixels.unlock();
				//newAtlas = FlxG.state.createAtlas("bgAtlas" + Std.string(i * 2 + j + 20), 2048, 2048);
				#if (cpp || neko)
					//bgs[i * 2 + j].atlas = newAtlas;
				#end
				//bg = new FlxSprite(i * colWidth, j*rowHeight);
				//bgs[num].pixels = bit;
				//#if (cpp || neko)
				 //bg.atlas = Registry.bgAtlas;
				//#end
				//bgs.push(bg);
				//bgs[i * 2 + j].updateAtlasInfo();
				//bgs[i*2+j].updateFrameData();
				//add(bgs[num]);
				//bg.active = false;
				//bg.visible = false;
				rect.y += rowHeight;
				num ++;
			}
			rect.x += colWidth;
		}
		for (bg in bgs)
		{
			add(bg);
		}
		//Get rid of that huge bitmapdata
		#if cpp
		bigBit.dumpBits();
		#else
		bigBit.dispose();
		#end
		bigBit = null;
		#if cpp
		bigVeggies.dumpBits();
		#else
		bigVeggies.dispose();
		#end
		bigVeggies = null;
		#if cpp
		skyslice.dumpBits();
		#else
		skyslice.dispose();
		#end
		skyslice = null;
	}
	
}