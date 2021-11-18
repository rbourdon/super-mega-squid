package com.pause9.supermegasquid;

import org.flixel.FlxObject;
import nape.geom.Vec2;

class Diver extends Human
{
	public function new(x,y)
	{
		super(x, y);
		loadGraphic("assets/diveranim.png", true, true, 64, 27);
		addAnimation("diving", [0, 1], 3, true);
		play("diving");
		createRectangularBody();
		setBodyMaterial(0, .2, .4, 7, .005);
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
		power = 20;
		dir = 1;
		maxHealth = 1;
		maxSpeed = Math.random() * 150 + 150;
		health = maxHealth;
	}
	override public function update():Void
	{
		super.update();
		//FlxG.log(_curFrame);
		var g:Float = Std.int(Math.random() * 1000);
		if (g == 5)
		{
			dir *= -1;
		}
		if (body.velocity.length < maxSpeed)
		{
			body.applyImpulse(Vec2.weak( power*dir, 0));
		}
	}
	public function deathEffects()
	{
		Registry.enemyManager.playBloodSplat(this);
	}
}