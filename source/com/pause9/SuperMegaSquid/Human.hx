package com.pause9.supermegasquid;

class Human extends Enemy
{
	public function new(x,y):Void
	{
		super(x, y);
		//body.cbTypes.add(Registry.HUMAN);
	}
	override public function update():Void
	{
		super.update();
	}
}