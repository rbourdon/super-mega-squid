package com.pause9.supermegasquid;

import org.flixel.FlxObject;
import nape.geom.Vec2;

class Crate extends Enemy
{
	public function new(x,y):Void
	{
		super(x, y);
		loadGraphic("assets/cargo.png");
		createRectangularBody();
		setBodyMaterial(0, .2, .35, 8, .005);
		antialiasing = true;
		#if (cpp || neko)
			atlas = Registry.myAtlas;
		#end
		body.position.x = x;
		body.position.y = y;
		this.x = x;
		this.y = y;
		//body.gravMass = 0;
		//body.mass = 6;
		//body.allowRotation = false;
		body.userData.sprite = this;
		//body.cbTypes.add(Registry.SUB);
		//body.cbTypes.add(Registry.ENEMY_COLLISION);
		//power = 8;
		//maxSpeed = Math.random() * 150 + 150;
	}
	override public function update():Void
	{
		super.update();
	}
	public function deathEffects():Void
	{
		Registry.enemyManager.playExplosion(this);
	}
}