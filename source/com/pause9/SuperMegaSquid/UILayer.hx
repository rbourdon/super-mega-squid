package com.pause9.supermegasquid;

import nme.display.Bitmap;
import nme.display.Shape;
import nme.display.Sprite;
import nme.Assets;
import nme.text.TextFormat;
import org.flixel.FlxG;
import nme.display.CapsStyle;
import nme.text.TextField;
import nme.text.TextFormatAlign;
import org.flixel.FlxSprite;

class UILayer extends Sprite
{
	private var layer:Sprite;
	private var humanFormat:TextFormat;
	private var humanText:TextField;
	//private var rageBar:Shape;
	
	public function new():Void
	{
		super();
		var font = Assets.getFont("assets/rockprp.ttf");
		//Draw Fill
		layer = new Sprite();
		//FlxG.log(FlxG._game.getChildAt(2));
		//drawLayer = cast(FlxG._game.getChildAt(0), Sprite);
		//FlxG._game.removeChildAt(0);
		//drawLayer = FlxG._game.getChildAt(1);
		layer.graphics.beginFill(0xC93D3D, .9);
		layer.graphics.drawRect(11, 11, 200, 20);
		layer.graphics.endFill();
		//FlxG._game.addChildAt(rageFill, 3);
		//Draw Outline
		layer.graphics.lineStyle(3, 0xFFFFFF, .7, true, null);
		layer.graphics.drawRoundRect(10, 10, 202, 22, 3);
		addChild(layer);
		
		//Human Count Bitmap
		var hCountBit:Bitmap = new Bitmap(Assets.getBitmapData("assets/humansalive.png", false));
		hCountBit.scaleX = hCountBit.scaleY = FlxG.camera.zoom;
		hCountBit.x = FlxG.stage.stageWidth - hCountBit.width - 10;
		hCountBit.y = 10;
		addChild(hCountBit);
		
		//Human Count Text
		humanText = new TextField();
		humanText.embedFonts = true;
		humanText.text = "100";
		humanText.selectable = false;
		//FlxG.log(font.fontName);
		humanFormat = new TextFormat(font.fontName, 18*FlxG.camera.zoom, 0xFFFFFF, null, null, null, null, null, TextFormatAlign.RIGHT);
		humanText.setTextFormat(humanFormat);
		humanText.x = hCountBit.x - humanText.width - 5;
		#if (mobile || desktop)
		humanText.y = 15;
		#else
		humanText.y = 14;
		#end
		addChild(humanText);
		
		
		var rageText:TextField = new TextField();
		rageText.embedFonts = true;
		rageText.text = "RAGE";
		rageText.selectable = false;
		//FlxG.log(font.fontName);
		var rageFormat:TextFormat = new TextFormat(font.fontName, 20*FlxG.camera.zoom, 0xFFFFFF);
		rageText.setTextFormat(rageFormat);
		rageText.x = 11;
		#if (mobile || desktop)
		rageText.y = 7;
		#else
		rageText.y = 8;
		#end
		addChild(rageText);
		
	}
	public function updateRageBar(rage:Int):Void
	{
		layer.graphics.clear();
		
		//Draw Fill
		layer.graphics.beginFill(0xC93D3D, .9);
		layer.graphics.drawRect(11, 11, rage*FlxG.camera.zoom, 20*FlxG.camera.zoom);
		layer.graphics.endFill();
		//Draw Outline
		layer.graphics.lineStyle(3, 0xFFFFFF, .7, true, null);
		layer.graphics.drawRoundRect(10, 10, 202*FlxG.camera.zoom, 22*FlxG.camera.zoom, 3);
	}
	public function updateHumanText():Void
	{
		humanText.text = Std.string(Registry.player.humansEaten);
		//humanText.selectable = false;
		//FlxG.log(font.fontName);
		humanText.setTextFormat(humanFormat);
	}
}