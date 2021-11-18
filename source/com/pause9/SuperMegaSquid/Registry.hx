package com.pause9.supermegasquid;

import org.flixel.FlxGroup;
import org.flixel.FlxSound;
import org.flixel.nape.FlxPhysSprite;
import nape.phys.Body;
import nape.shape.Shape;
import org.flixel.FlxG;
import org.flixel.nape.FlxPhysState;
import nape.callbacks.InteractionListener;
import nape.callbacks.InteractionType;
import nape.callbacks.CbEvent;
import nape.callbacks.CbType;
import nape.callbacks.InteractionCallback;
import nape.phys.BodyType;
import org.flixel.system.layer.Atlas;

class Registry
{
	public static var player:Player;
	public static var water:WaveMachine;
	public static var waveSprite:Body;
	public static var SWAN:CbType;
	public static var PLAYER:CbType;
	public static var PLAYERHEAD:CbType;
	public static var WATER:CbType;
	public static var BOAT:CbType;
	public static var BALLOON:CbType;
	public static var FISH:CbType;
	public static var HUMAN:CbType;
	public static var SHARK:CbType;
	public static var SUB:CbType;
	public static var CHOPPER:CbType;
	public static var PLANE:CbType;
	public static var GULL:CbType;
	public static var EEL:CbType;
	public static var TERRAIN:CbType;
	public static var ENEMY_COLLISION:CbType;
	public static var EGGBOMB:CbType;
	public static var levelBG:LevelBG;
	public static var levelBody:LevelBody;
	public static var myAtlas:Atlas;
	public static var enemyManager:EnemyManager;
	public static var analog:SquidAnalog;
	public static var uiLayer:UILayer;
	public static var loadScreen:LoadingScreen;
	public static var effects:FlxGroup;
	public static var windSound:FlxSound;
	public static var playerLandSound:FlxSound;
	//public static var bgAtlas:Atlas;
	
	public static function init()
	{
		loadScreen = new LoadingScreen();
		FlxG._game.addChildAt(loadScreen, 1);
		myAtlas = FlxG.state.createAtlas("atlas1", 2048, 2048);
		//bgAtlas = FlxG.state.createAtlas("bgatlas", 9000, 3000);
		PLAYERHEAD = new CbType();
		PLAYER = new CbType();
		SWAN = new CbType();
		GULL = new CbType();
		WATER = new CbType();
		BOAT = new CbType();
		BALLOON = new CbType();
		FISH = new CbType();
		SHARK = new CbType();
		HUMAN = new CbType();
		TERRAIN = new CbType();
		EGGBOMB = new CbType();
		SUB = new CbType();
		EEL= new CbType();
		CHOPPER = new CbType();
		PLANE = new CbType();
		ENEMY_COLLISION = new CbType();
		effects = new FlxGroup();
		windSound = new FlxSound();
		//windSound = FlxG.play("Wind_Ambient", .3, true, false);
		playerLandSound = new FlxSound();
		//playerLandSound = FlxG.play("Player_Land", 0, false, false);
		//windSound.
		//water.x = -FlxG.stage.width / 2;
		//water.y = -240;
		FlxPhysState.space.listeners.add(new InteractionListener(
            CbEvent.BEGIN,
			InteractionType.FLUID,
            PLAYERHEAD,
			WATER,
            playerWet,
            /*precedence*/ 1
        ));
		FlxPhysState.space.listeners.add(new InteractionListener(
            CbEvent.END,
			InteractionType.FLUID,
            PLAYERHEAD,
            WATER,
            playerDry,
            /*precedence*/ 1
        ));
		FlxPhysState.space.listeners.add(new InteractionListener(
            CbEvent.BEGIN,
			InteractionType.COLLISION,
            PLAYERHEAD,
            TERRAIN,
            playerLand,
            /*precedence*/ 2
        ));
	}
	public static function playerWet(cb:InteractionCallback):Void
	{
		if (!player.canMove)
		{
			//FlxG.log("Enter Water");
			player.canMove = true;
		}
		//FlxG.log(player.wet);
		if (!player.wet)
		{
			//FlxG.log("Enter Water");
			player.wet = true;
			player.canLunge = true;
			FlxG.play("Player_Splash", .3);
			//windSound.pause();
			//FlxG.play("Underwater_Ambient", 1, true);
		}
	}
	public static function playerDry(cb:InteractionCallback):Void
	{
		if (player.wet)
		{
			//FlxG.log(windSound);
			player.wet = false;
			//windSound.resume();
			//FlxG.play("Wind_Ambient", 1, true);
		}
		if (player.canMove)
		{
			player.canMove = false;
		}
	}
	private static function playerLand(cb:InteractionCallback):Void
	{
		if (!player.wet)
		{
			FlxG.play("Player_Land", Math.random() * .1 + .1);
			FlxG.camera.shake(.1, .5);
		}
		player.canLunge = true;
	}
}