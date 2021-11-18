package com.pause9.supermegasquid;

import org.flixel.FlxObject;
import nape.geom.Vec2;

class Sub extends Enemy
{
	public function new(x,y):Void
	{
		super(x, y);
		loadGraphic("assets/submarine.png", false, true);
		createRectangularBody();
		setBodyMaterial(.5, .2, .4, 7, .005);
		antialiasing = true;
		#if (cpp || neko)
			atlas = Registry.myAtlas;
		#end
		body.position.x = x;
		body.position.y = y;
		//body.gravMass = 0;
		//body.mass = 6;
		body.allowRotation = false;
		body.userData.sprite = this;
		body.cbTypes.add(Registry.SUB);
		body.cbTypes.add(Registry.ENEMY_COLLISION);
		power = 8;
		maxSpeed = Math.random() * 150 + 150;
	}
	override public function update():Void
	{
		super.update();
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
		Registry.enemyManager.playExplosion(this);
	}
}