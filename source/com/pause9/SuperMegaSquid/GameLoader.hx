package com.pause9.supermegasquid;

#if cpp
import cpp.vm.Gc;
#end
import nape.phys.Body;
import nape.phys.BodyType;
import nme.display.Bitmap;
import nme.display.BitmapData;
import org.flixel.nape.FlxPhysState;
import org.flixel.FlxG;
import nme.geom.Rectangle;
import nme.Assets;
import nme.geom.Point;

class GameLoader
{
	public var tasks:Array<String>;
	public var loaded:Bool;
	
	public function new():Void
	{
		tasks = new Array<String>();
		//tasks.push("createSky");
		tasks.push("createPlayer");
		tasks.push("createUILayer");
		tasks.push("createLevelBody");
		tasks.push("createLevelBG");
		tasks.push("levelPhysics");
		tasks.push("compositeBG");
		tasks.push("createEnemyManager");
		tasks.push("createWaveBody");
		tasks.push("createWaveMachine");
		tasks.push("finish");
	}
	public function update():Void
	{
		if (tasks.length > 0)
		{
			Reflect.field(this, tasks[0])();
			tasks.splice(0, 1);
		}
	}
	private function createPlayer():Void
	{
		Registry.player = new Player();
		Registry.loadScreen.updateBar(5);
	}
	private function createUILayer():Void
	{
		Registry.uiLayer = new UILayer();
		Registry.loadScreen.updateBar(10);
	}
	private function createLevelBody():Void
	{
		Registry.levelBody = new LevelBody(0, 0);
		Registry.loadScreen.updateBar(15);
	}
	private function createLevelBG():Void
	{
		Registry.levelBG = new LevelBG();
		Registry.loadScreen.updateBar(20);
	}
	private function levelPhysics():Void
	{
		Registry.levelBG.createWorldPhysics();
		Registry.loadScreen.updateBar(50);
	}
	private function compositeBG():Void
	{
		Registry.levelBG.compositeBG();
		Registry.loadScreen.updateBar(75);
		//#if cpp
		//cpp.vm.Gc.run(false);
		//#end
	}
	private function createEnemyManager():Void
	{
		Registry.enemyManager = new EnemyManager();
		Registry.loadScreen.updateBar(95);
	}
	private function createWaveBody():Void
	{
		Registry.waveSprite = new Body(BodyType.KINEMATIC);
		Registry.waveSprite.cbTypes.add(Registry.WATER);
		Registry.waveSprite.disableCCD = true;
		Registry.waveSprite.space = FlxPhysState.space;
		Registry.loadScreen.updateBar(100);
	}
	private function createWaveMachine():Void
	{
		Registry.water = new WaveMachine();
	}
	private function finish():Void
	{
		loaded = true;
		#if cpp
		cpp.vm.Gc.run(false);
		#end
		FlxG.playMusic("BGMusic", .3);
	}
	public function destroy():Void
	{
		tasks.splice(0, tasks.length);
		tasks = null;
		Registry.loadScreen.kill();
	}
}