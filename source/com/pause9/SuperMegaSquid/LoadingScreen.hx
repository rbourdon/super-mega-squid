package com.pause9.supermegasquid;

import nme.display.Bitmap;
import nme.display.Shape;
import nme.display.Sprite;
import org.flixel.FlxG;
import nme.text.TextFormat;
import nme.Assets;
import nme.text.TextField;
import nme.text.TextFormatAlign;
import nme.display.PixelSnapping;

class LoadingScreen extends Sprite
{
	private var bar:Shape;
	private var bg:Bitmap;
	private var loadText:TextField;
	
	public function new():Void
	{
		super();
		//Loading Text
		loadText = new TextField();
		loadText.width = FlxG.stage.stageWidth;
		loadText.embedFonts = true;
		loadText.selectable = false;
		loadText.text = "Loading...";
		var font = Assets.getFont("assets/rockprp.ttf");
		//FlxG.log(font.fontName);
		var loadFormat:TextFormat = new TextFormat(font.fontName, 24*FlxG.camera.zoom, 0xFFFFFF, null, null, null, null, null, TextFormatAlign.CENTER);
		loadText.setTextFormat(loadFormat);
		loadText.x = 0;
		//#if (mobile || desktop)
		loadText.y = FlxG.stage.stageHeight / 2 + 15;
		//#else
		//loadText.y = 8;
		//#end
		
		//BG
		bg = new Bitmap(Assets.getBitmapData("assets/menubg.png", false), PixelSnapping.ALWAYS, true);
		bg.scaleX *= FlxG.camera.zoom;
		bg.scaleY *= FlxG.camera.zoom;
		bg.x = -240; 
		bg.y = -120;
		
		addChild(bg);
		addChild(loadText);
		
		//BAR
		bar = new Shape();
		bar.graphics.beginFill(0xFFFFFF, 1);
		bar.graphics.drawRect( FlxG.width - FlxG.width / 2 - 300, FlxG.stage.stageHeight / 2 + 50*FlxG.camera.zoom + 20, 40*FlxG.camera.zoom, 30*FlxG.camera.zoom);
		bar.graphics.endFill();
		addChild(bar);
	}
	public function updateBar(percent):Void
	{
		bar.graphics.clear();
		
		//BAR
		bar.graphics.beginFill(0xFFFFFF, 1);
		bar.graphics.drawRect( FlxG.width - FlxG.width / 2 - 300, FlxG.stage.stageHeight - FlxG.stage.stageHeight / 2 + 50*FlxG.camera.zoom, percent * 6 * FlxG.camera.zoom, 30*FlxG.camera.zoom);
		bar.graphics.endFill();
	}
	public function kill():Void
	{
		loadText.text = "";
		removeChild(loadText);
		loadText = null;
		
		bar.graphics.clear();
		removeChild(bar);
		bar = null;
		
		removeChild(bg);
		bg.bitmapData = null;
		bg = null;
	}
}