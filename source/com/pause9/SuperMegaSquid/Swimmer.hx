package com.pause9.supermegasquid;

import org.flixel.FlxObject;
import nape.geom.Vec2;
import org.flixel.FlxG;
import org.flixel.system.FlxAnim;

class Swimmer extends Human
{
	public function new(x,y):Void
	{
		super(x, y);
		var sex:Int = Math.floor(Math.random() * 2);
		if (sex == 0)
		{
			//FlxG.log("male swimmer");
			loadGraphic("assets/maleswimanim.png", true, false, 46, 58);
			//var anim = new FlxAnim("wade", [0, 1], 2, true);
			addAnimation("wade", [0, 1], 2, true);
			play("wade", true);
		}
		else
		{
			//FlxG.log("female swimmer");
			loadGraphic("assets/femaleswimanim.png", true, false, 44, 51);
			addAnimation("wade2", [0, 1], 2, true);
			play("wade2", true);
		}
		createRectangularBody();
		setBodyMaterial(0, .2, .4, 5, .005);
		#if (cpp || neko)
			atlas = Registry.myAtlas;
		#end
		body.position.x = x;
		body.position.y = y;
		//body.gravMass = 0;
		//body.mass = 6;
		body.allowRotation = false;
		body.userData.sprite = this;
		body.cbTypes.add(Registry.HUMAN);
		body.cbTypes.add(Registry.ENEMY_COLLISION);
		power = 3;
	}
	override public function update():Void
	{
		super.update();
		/*var g:Float = Std.int(Math.random() * 1000);
		if (g == 5)
		{
			dir *= -1;
			if (dir == -1)
			{
				facing = FlxObject.LEFT;
			}
			else
			{
				facing = FlxObject.RIGHT;
			}
		}
		if (dir == 1)
		{
			if (body.velocity.length < 150)
			{
				body.applyImpulse(Vec2.weak(6, 0));
			}
		}
		else
		{
			if (body.velocity.length < 150)
			{
				body.applyImpulse(Vec2.weak( -6, 0));
			}
		}*/
	}
	public function deathEffects()
	{
		Registry.enemyManager.playBloodSplat(this);
	}
}