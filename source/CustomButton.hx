package;
import org.flixel.FlxGroup;
import org.flixel.FlxSprite;
import org.flixel.FlxText;
import org.flixel.plugin.photonstorm.FlxExtendedSprite;
import org.flixel.FlxG;

class CustomButton extends FlxGroup
{
	public var hover:Bool;
	private var normImg:String;
	private var downImg:String;
	private var hoverImg:String;
	private var onUp:Void->Void;
	private var pixelPerfect:Bool;
	private var group:FlxGroup;
	public var text:FlxText;
	public var graphic:FlxSprite;
	public var idNum:Int;
	public var disabled:Bool;
	
	public function new(x:Float = 0, y:Float = 0, onClick:Void->Void = null, nImg:String = null, hImg:String = null, dImg:String = null, pPerfect:Bool = false, grp:FlxGroup = null, id:Int = 1)
	{
		super();
		idNum = id;
		//text = new FlxText(0, 0, 100, null, true);
		disabled = false;
		hover = false;
		group = grp;
		pixelPerfect = pPerfect;
		normImg = nImg;
		hoverImg = hImg;
		downImg = dImg;
		onUp = onClick;
		graphic = new FlxSprite(x, y, normImg);
		text = new FlxText(x, y, Std.int(graphic.width), null, true);
		text.setFormat("assets/blutter", 36, 0xe5e5e5, "center");
		add(graphic);
		add(text);
		graphic.loadGraphic(normImg);
		graphic.centerOffsets();
	}
	override function update()
	{
		super.update();
		if (!disabled)
		{
			hoverControl();
		}
	}
	private function hoverControl()
	{
		if (graphic.overlapsPoint(FlxG.mouse.getScreenPosition()))
		{	
			if (pixelPerfect)
			{
				if (checkHover() && graphic.pixelsOverlapPoint(FlxG.mouse.getScreenPosition()))
				{	
					if (hover == false)
					{
						if (hoverImg != null)
						{
							graphic.loadGraphic(hoverImg);
						}
						hover = true;
					}
					if (FlxG.mouse.justReleased())
					{
						//flicker(5);
						if (onUp != null)
						{
							onUp();
						}
						//FlxG.log("click");
					}
				}
				else if (hover)
				{	
					graphic.loadGraphic(normImg);
					hover = false;
				}
			}
			else if (checkHover())
			{
				if (hover == false)
				{
					if (hoverImg != null)
					{
						graphic.loadGraphic(hoverImg);
					}
					hover = true;
				}
				if (FlxG.mouse.justReleased())
				{
					if (onUp != null)
					{
						onUp();
					}
				}
			}
			else if (hover)
			{	
				graphic.loadGraphic(normImg);
				hover = false;
			}
		}
		else if (hover)
		{	
			graphic.loadGraphic(normImg);
			hover = false;
		}
	}
	private function checkHover():Bool
	{
		var result:Bool = true;
		if (group != null)
		{
			var found:Bool = false;
			//var i = group.members.length - 1;
			for( i in group.members)
			{
				if (Std.is(i, CustomButton))
				{
					var butt = cast(i, CustomButton);
					if (butt.hover == true && butt != this)
					{
						if (butt.idNum <= idNum)
						{
							found = true;
						}
						/*if (hover && idNum > butt.idNum)
						{
							hover = false;
							graphic.loadGraphic(normImg);
						}*/
					}
				}
			}
			if (found)
			{
				result = false;
			}
		}
		return result;
	}
}