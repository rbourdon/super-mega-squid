package;

import nme.Lib;
import org.flixel.FlxGame;
import nme.display.StageScaleMode;
	
class ProjectClass extends FlxGame
{	
	public function new()
	{
		var stageWidth:Int = Lib.current.stage.stageWidth;
		var stageHeight:Int = Lib.current.stage.stageHeight;
		var ratioX:Float = stageWidth / 800;
		var ratioY:Float = stageHeight / 480;
		var ratio:Float = Math.min(ratioX, ratioY);
		super(Math.floor(stageWidth / ratio), Math.floor(stageHeight / ratio), MenuState, ratio, 60, 60);
		forceDebugger = true;
		Lib.current.stage.scaleMode = StageScaleMode.NO_SCALE;
	}
}
