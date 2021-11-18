package com.pause9.supermegasquid;

import org.flixel.FlxObject;
import nape.geom.Vec2;

class Swan extends Enemy
{
	public function new(x,y)
	{
		super(x,y);
		loadGraphic("assets/swananim.png", true, true, 28, 27);
		addAnimation("swan", [0, 1], 3, true);
		play("swan");
		createRectangularBody();
		#if (cpp || neko)
			atlas = Registry.myAtlas;
		#end
		body.position.x = x;
		body.position.y = y;
		body.gravMass = 0;
		//body.mass = 4;
		body.allowRotation = false;
		body.userData.sprite = this;
		body.cbTypes.add(Registry.SWAN);
		body.cbTypes.add(Registry.ENEMY_COLLISION);
		power = 20;
		maxSpeed = Math.random() * 100 + 150;
		maxHealth = 1;
		dir = 1;
		health = maxHealth;
	}
	override public function update():Void
	{
		super.update();
		if (Math.abs(body.velocity.y) > 3)
		{
			body.velocity.y *= .9;
		}
		var g:Float = Std.int(Math.random() * 1000);
		if (g == 5)
		{
			dir *= -1;
		}
		if (body.velocity.length < maxSpeed)
		{
			body.applyImpulse(Vec2.weak(power * dir, 0));
		}
	}
	public function deathEffects()
	{
		Registry.enemyManager.playBloodSplat(this);
	}
}