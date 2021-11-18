package com.pause9.supermegasquid;

import nape.shape.Polygon;
import org.flixel.nape.FlxPhysSprite;

class EggBomb extends FlxPhysSprite
{
	private var life:Int;
	private var maxLife:Int;
	public function new(x,y)
	{
		super(x, y);
		loadGraphic("assets/eggbomb2.png");
		antialiasing = true;
		body.shapes.clear();
		body.shapes.add(new Polygon(Polygon.box(12, 18, true)));
		setBodyMaterial(1, .2, .4, 4.5, .001);
		maxLife = 350;
		life = maxLife;
		body.cbTypes.add(Registry.EGGBOMB);
		body.userData.sprite = this;
	}
	override public function update():Void
	{
		super.update();
		if (life <= 0)
		{
			kill();
		}
		else
		{
			life --;
		}
	}
	override public function revive():Void
	{
		super.revive();
		life = maxLife;
		//body.velocity.length = 0;
	}
}