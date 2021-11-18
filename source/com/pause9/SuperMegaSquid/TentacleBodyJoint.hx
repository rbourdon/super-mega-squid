package com.pause9.supermegasquid;

import nape.constraint.UserConstraint;
import nape.phys.Body;
import nape.geom.Vec2;
import nape.TArray;
import nape.geom.Vec3;

class TentacleBodyJoint extends UserConstraint
{
	public var body1(default,set_body1):Body;
	public var body2(default,set_body2):Body;

	public var anchor1(default, set_anchor1):Vec2;
	public var anchor2(default, set_anchor2):Vec2;

	//. this handles body assignment perfectly!
	//  registerBody will deregister the old one, and register the new one returning it
	//. registering/deregestering occur in pairs and can happen multiple times.
	//. null values are checked to make sure everything occurs as it should internally.
	
	function set_body1(body1:Body)  return this.body1 = __registerBody(this.body1, body1)
	function set_body2(body2:Body)  return this.body2 = __registerBody(this.body2, body2)
	
	function set_anchor1(anchor1:Vec2)
	{ 
			if (this.anchor1 == null) this.anchor1 = __bindVec2();
			return this.anchor1.set(anchor1);
	}
	function set_anchor2(anchor2:Vec2)
	{ 
			if (this.anchor2 == null) this.anchor2 = __bindVec2();
			return this.anchor2.set(anchor2);
	}

	public function new(body1:Body,body2:Body,anchor1:Vec2,anchor2:Vec2) {
		super(2); //2 dimensional constraint.

		this.body1 = body1;
		this.body2 = body2;

		this.anchor1 = anchor1;
		this.anchor2 = anchor2;
		this.debugDraw = true;
		
	}

	//------------------------------------------------------------

	public override function __copy():UserConstraint {
		//simply need to produce a copy of the constraint in this manner
		//when the normal Constraint::copy() function is called
		//this method is called first, and then all other properties shared between Constraints
		//are copied also.
		return new TentacleBodyJoint(body1,body2,anchor1,anchor2);
	}

	//public override function __destroy():Void {} //nothing extra needs to be done
	var rel1:Vec2;
	var rel2:Vec2;
	public override function __validate():Void {
		//here we can pre-calculate anything that is persistant throughout a step
		//in this case, the relative anchors for each body to be used
		//throughout the velocity iterations.
		//trace("validate");
		rel1 = body1.localVectorToWorld(anchor1); //body1.localPointToWorld(anchor1);
		rel2 = body2.localVectorToWorld(anchor2);
	}

	//--------------------------------------------------------------

	//positional error
	public override function __position(err:TArray<Float>) {
		err[0] = (body2.position.x + rel2.x) - (body1.position.x + rel1.x);
		err[1] = (body2.position.y + rel2.y) - (body1.position.y + rel1.y);
	}

	//velocity error (time-derivative of positional error)
	public override function __velocity(err:TArray<Float>) {
		var v1 = body1.constraintVelocity;		
		var v2 = body2.constraintVelocity;		
		err[0] = (v2.x - rel2.y*v2.z) - (v1.x - rel1.y*v1.z);
		err[1] = (v2.y + rel2.x*v2.z) - (v1.x + rel1.x*v1.z);
	}

	//effective mass matrix
	//K = J*M^-1*J^T where J is the jacobian of the velocity error.
	//
	//output should be a compact version of the eff-mass matrix like
	// [ eff[0], eff[1] ]
	// [ eff[1], eff[2] ]
	public override function __eff_mass(eff:TArray<Float>) {
		//recompute relative vectors for positional updates
		//__validate();
		//constraintMass is well defined on all bodies as the mass/inertia we should use for constraints
		var m1 = body1.constraintMass; var i1 = body1.constraintInertia;
		//trace(m1);
		//trace(i1);
		var m2 = body2.constraintMass; var i2 = body2.constraintInertia;
		eff[0] = m1 + m2 + rel1.y*i1 + rel2.y*rel2.y*i2;
		eff[1] =         - rel1.x*rel1.y*i1 - rel2.x*rel2.y*i2;
		eff[2] = m1 + m2 + rel1.x*i1 + rel2.x*rel2.x*i2;
		//eff[0] = 0;
		//eff[1] = 0;
	}

	//public override function __clamp(jAcc:ARRAY<Float>):Void {} // nothing needs to be done here.

	//--------------------------------------------------------------

	//this is computed as a selection from the full world impulse
	//imp = J^T * constraint_imp
	public override function __impulse(imp:TArray<Float>,body:Body,out:Vec3) {
		var scale = if(body==body1) -1.0 else 1.0;
		var relv   = if(body==body1) rel1 else rel2;
		out.x = imp[0]*scale;
		out.y = imp[1]*scale;
		out.z = scale*relv.cross(new Vec2(imp[0],imp[1]));
	}
}