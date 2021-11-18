package com.pause9.supermegasquid;

import nme.display.Sprite;
import nme.Lib;
import org.flixel.FlxGame;
import nme.display.StageScaleMode;
import nme.display.StageQuality;
import org.flixel.FlxG;
	
class ProjectClass extends FlxGame
{	
	//public static var water:Sprite;
	
	public function new()
	{
		//water = w;
		//addChild(water);
		var stageWidth:Int = Lib.current.stage.stageWidth;
		var stageHeight:Int = Lib.current.stage.stageHeight;
		var ratioX:Float = Lib.current.stage.stageWidth / 800;
		var ratioY:Float = Lib.current.stage.stageHeight / 480;
		//FlxG.log(ratioX);
		var ratio:Float = Math.min(ratioX, ratioY);
		super(Math.ceil(stageWidth / ratio), Math.ceil(stageHeight / ratio), MenuState, ratio, 60, 60);
		//forceDebugger = true;
		//Lib.current.stage.scaleMode = StageScaleMode.NO_SCALE;
		//Lib.current.stage.quality = StageQuality.HIGH;
		
		#if mobile
		FlxG.addSound("BGMusic");
		FlxG.addSound("Explosion");
		FlxG.addSound("Splat");
		FlxG.addSound("Spin");
		FlxG.addSound("Player_Land");
		FlxG.addSound("Player_Splash");
		#end
	}
}
