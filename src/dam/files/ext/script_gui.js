Ext.ux.Select = function(config) {
 	this.values = config.values; 	
 	
    // call parent constructor
    Ext.ux.Select.superclass.constructor.call(this, config);
 
}; 

Ext.extend(Ext.ux.Select, Ext.form.ComboBox, {	
    initComponent:function() {
    	var values = this.values;
    	
    	 Ext.apply(this, {
    	 	store:  new Ext.data.ArrayStore({        
		        fields: [
		            'value'
		        ],
		        data: values
		    }),
		    value: values[0]
    	 });
    	
    	Ext.ux.Select.superclass.initComponent.call(this);
    },
    allowBlank: false,
    autoSelect: true,
    editable: false,
    triggerAction: 'all',
    lazyRender:true,
    forceSelection: true,
    mode: 'local',
    valueField: 'value',
    displayField: 'value'
    
 
}); 

Ext.reg('select', Ext.ux.Select);


Ext.ux.CBFieldSet = function(config) {
	config.collapsed = true;
	if (config.items){
		Ext.each(config.items, function(item){
			item.disabled = true;
		});
	}
	
	Ext.ux.CBFieldSet.superclass.constructor.call(this, config);
};


Ext.extend(Ext.ux.CBFieldSet, Ext.form.FieldSet, {
	 initComponent:function() {
	 	 var cb_id = Ext.id();
	 	 Ext.apply(this, {
	 	 	cb_id: cb_id,
	 	 	checkboxToggle: {tag: 'input', type: 'checkbox', name: this.checkboxName || this.id+'-checkbox', id: cb_id}
	 	 });
	 	Ext.ux.CBFieldSet.superclass.initComponent.call(this);
	 },
	
	 onCheckClick: function(){
	 	var cb = Ext.get(this.cb_id);

	 	if (cb.dom.checked){
	 		this.expand();
	 		Ext.each(this.items.items, function(item){
	 			item.enable();
	 		});
	 	}
	 	else{
	 		this.collapse();
	 		Ext.each(this.items.items, function(item){
	 			item.disable();
	 		});
	 		
	 	
	 	}
	 }
	
});

Ext.reg('cbfieldset', Ext.ux.CBFieldSet);

var MDAction =  function(opts, layer) {	
	this.id = opts.id || Ext.id();
	this['in'] = opts['in'];
	this.out = opts.out; 
	this.inputs = opts.inputs || [];
	this.outputs = opts.outputs || [];
	opts.terminals = [];
	this.params = opts.params;
	opts.resizable = false;
	this.label = opts.label || opts.title;

	for(var i = 0 ; i < opts.inputs.length ; i++) {
		var input = this.inputs[i];
		opts.terminals.push({
			"name": input, 
			"direction": [-1,0], 
			"offsetPosition": {"left": -14, "top": 3+23*(i+1) }, 
			"ddConfig": {
				"type": "input",
				"allowedTypes": ["output"]
			} 
		});
	}
	for(i = 0 ; i < this.outputs.length ; i++) {
		var output = this.outputs[i];
		opts.terminals.push({
			"name": output, 
			"direction": [1,0], 
			"offsetPosition": {"right": -14, "top": 3+10*(i+1+this.inputs.length) }, 
			"ddConfig": {
				"type": "output",
				"allowedTypes": ["input"]
			},
			"alwaysSrc": true
		});
	}
	
	
	
	MDAction.superclass.constructor.call(this, opts, layer);
	layer.containers.push(this);

}; 
YAHOO.lang.extend(MDAction, WireIt.Container, {
	
	getXY: function(){
		return Ext.get(this.el).getXY();
	},
	
	getOutputs: function(){
		var outputs = [];
		var output_wires= this.getTerminal(this.outputs).wires;
		Ext.each(output_wires, function(wire){
			if (wire)
				outputs.push(wire.label);
		});
		return outputs;

	},
	
	getInputs: function(){
		var inputs = [];
		var input_wires= this.getTerminal(this.inputs).wires;
		Ext.each(input_wires, function(wire){
			if (wire)
				inputs.push(wire.label);
		});
		return inputs;

	},
	
	getParams: function(){
		return this.form.getForm().getValues();
		
	},
	
	onAddWire: function(e, args){
		var wire = args[0];
		wire.label = Ext.id();
		
	
		
	},
	
	render: function(){
		
	 	MDAction.superclass.render.call(this);
	 	
	 	var form = new Ext.form.FormPanel({
//	 		renderTo: this.bodyEl,
	 		bodyStyle: {paddingTop: 10},
	 		autoHeight: true,
	 		autoScroll: true,
	 		border: false,
	 		items: this.params,
	 		
//	 		collapsible: true,
	 		listeners:{
	 			afterrender:function(){
	 				this.collapse();
	 			
	 			}
	 		}
	 	});
	 	this.form = form;
	 	
	 	this.label = new Ext.form.TextField({
 			value: this.label,
 			width: 300 			
 		}); 		
	 	
 		var BUTTON_EDIT = 'Edit', BUTTON_HIDE = 'Hide';
	 	var panel = new Ext.Panel({
	 		renderTo: this.bodyEl,
	 		items: [
	 		
	 		
	 		new Ext.form.CompositeField({
	 			items:[
	 				this.label,
			 		new Ext.Button({
			 			text: BUTTON_EDIT,
			 			
			 			handler: function(){
			 				if (this.getText() == BUTTON_EDIT){
			 					this.setText(BUTTON_HIDE);
			 					form.expand();	
			 				}
			 				else{
			 					this.setText(BUTTON_EDIT);
			 					form.collapse();	
			 				
			 				}
			 				
			 			}
			 		})
	 			]
	 		
	 		}),
	 		
	 		form
	 		],
	 		border: false
	 	
	 	});
	}

});


var baseLayer, store, layer_el;

function save_script(params){
	console.log('save_script');
	Ext.Ajax.request({
		url: '/edit_script/',
		params: params,
		success: function(response){
//		  	Ext.MsgBox.msg('','Script saved');
			Ext.Msg.alert('Save', 'Script saved successfully.');
			script_type = params.type;
			if (! script_pk)
				script_pk = Ext.decode(response.responseText).pk;
			window.opener.scripts_jsonstore.reload();
		},
		failure: function(){
//		            			Ext.MsgBox.msg('','Save failed');
			Ext.Msg.alert('Save', 'Saving script  failed'); 
		}
		
		
	});


};

//YAHOO.inputEx.spacerUrl = "/files/WireIt-0.5.0/lib/inputex/images/space.gif";

Ext.onReady(function(){
	Ext.get('switch_ws_bar').setStyle({marginTop: 10});
	Ext.get('switch_ws_bar').dom.innerHTML = workspace.name;
	
	var store = new Ext.data.JsonStore({
		url:'/get_actions/',
		fields:['name', 'params'],
//			autoLoad: true,
		root: 'scripts'	
	});
	
	new Ext.Viewport({
		layout: 'border',
		items:[
			header,
					
			new Ext.grid.GridPanel({
				region: 'east',
				title: 'Actions',
				layout: 'fit',
				width: 200,
//				autoHeight: true,
				enableDragDrop: true,
				ddGroup: 'wireit',		
				
					store: store,
					columns:[{
						name: 'Script',
						dataIndex: 'name'
					}],
				hideHeaders: true,
				viewConfig: {
		        forceFit: true}
		
				
			}),
			
			new Ext.Panel({
				region: 'center',
				items: new Ext.BoxComponent({
			    autoEl: {
			        tag: 'div',
			        id: "wire-layer",
			        'class':"wireit"
			        
			    },
						
				region: 'center',
				listeners:{
					afterrender: function(){
						layer_el = this.getEl();
						
						baseLayer = new WireIt.Layer({
							layerMap: false,
							parentEl: layer_el
							
						});
						
						baseLayer.getJson =  function(){
								var actions_json = {};
								
								Ext.each(this.containers, function(action){
									if (action){
										
										var posXY = action.getXY();
										console.log(action);
										actions_json[action.id] = {
											params: action.getParams(),
											'in': action.getInputs(),
											out: action.getOutputs(),
											script_name: action.options.title,
											x: posXY[0],
											y: posXY[1],
											label: action.label.getValue()
										}					
									
									}
							}
							
							
							);
								return actions_json;
						
						};
		


						
						
          new Ext.dd.DropZone(Ext.get('wire-layer'),{
          	ddGroup: 'wireit',
          	onContainerOver: function(){
          		return this.dropAllowed;
          	},
          	onContainerDrop: function( source, e, data ){
          		
          		
          		var params = data.selections[0].data.params;
          		var script_name = data.selections[0].data.name;
          		var fields = [];
          		
          		
          		var drop_x = e.xy[0];
          		var drop_y = e.xy[1];
          	
          		var action = new MDAction({
			            title: script_name,
			            label: params.label,
			            position:[drop_x,drop_y],
//			            legend:'thumbnail',
			           
		            	inputs: ['in'],
		            	outputs: ['out'],
			            params: params
			            
			    }, baseLayer);
			   
          	} 
          	
          });
           
          store.load({
          	callback:function(){
          		if (script_name)
          			Ext.getCmp('script_name').setValue(script_name);
          		
          		if (params){
          			console.log(params);
          			var action;
          			for (action_name in params){
          				if (action_name){

          					action = params[action_name];
          					
          					var action_stored = store.query('name', action.script_name).items;
          					
          					if(action_stored.length > 0){
          						action_stored = action_stored[0];
//          						console.log(action_stored = action_stored[0]);
          						var action_box = new MDAction({
						            title: action_stored.data.name,
						            position:[20,20],
			//			            legend:'thumbnail',
						           	'in': action['in'],
						           	'out': action['out'],
					            	inputs: ['in'],
					            	outputs: ['out'],
					            	position: [action.x, action.y],
						            params: action_stored.data.params,
						            label: action.label
						            
						    	}, baseLayer); 
						    	action_box.form.getForm().setValues(action.params);
          						
          						Ext.each(action_box.form.items.items, function(field){
          							
          							if (field.xtype == 'cbfieldset'){
          								Ext.each(field.items.items, function(f){          									
          									if (f.value){
          										f.enable();
          										field.expand();
          									}
          									
          								});
          								
          							}
          								
          						});
          						
          					}
          					
          					
          				}
          			}
          			var w;
          			Ext.each(baseLayer.containers, function(action){
          				console.log(action.options.title);
						Ext.each(baseLayer.containers, function(inner_action){
							console.log(inner_action.options.title);
							Ext.each(action['out'], function(out){
								Ext.each(inner_action['in'], function(_in){
									
									if (out && out == _in){
										w = new WireIt.Wire(action.getTerminal('out'), inner_action.getTerminal('in'), layer_el.dom);
//								
										w.drawBezierCurve();	
									}
									
								});
								
							});
							if(action['out'][0] &&  action['out'][0] == inner_action['in'][0] ){
								
								
								
							}	
						});
					
					
					});
          			
          		}
          	}
          
          });
						
						
						
					}
				}
			
			}),
				tbar: new Ext.Toolbar({
//				   region: 'north',
				    
				    height: 25,
				    items: [
					    {
						    xtype: 'tbtext', 
						    text: 'Name: '
					    } ,
				   		{
					   		id: 'script_name',
				            xtype: 'textfield',
				            name: 'name',
				            allowBlank: false
			//	            emptyText: 'new script'
			        	},
			        	{
						    xtype: 'tbtext', 
						    text: 'Event: '
					    } ,
			        	
			        	{
					   		id: 'script_type',
					   		
				            xtype: 'combo',
				            name: 'type',
				            allowBlank: true,	             
						    autoSelect: true,
						    editable: false,
						    triggerAction: 'all',
						    lazyRender:true,
			//			    forceSelection: true,
			//			    store: new Ext.data.JsonStore({
			//			    	url: '/get_script_types/',
			//			    	fields: ['pk', 'name'],
			//			    	roots: 'types'			    
			//			    }),
						    mode: 'local',
						    store:  new Ext.data.ArrayStore({        
					        	fields: ['pk', 'name'],
					        	data: types_available
				    		}),		
					    
						    value: script_type,
							    
						    valueField: 'pk',
						    displayField: 'name'
					            
				
				        	},
				        	
				        	{xtype: 'tbspacer'},
				        	
				        {
				            // xtype: 'button', // default for Toolbars, same as 'tbbutton'
				            text: 'SAVE',
				            id: 'save_button',
				            icon: '/files/images/icons/save.gif',
				            handler: function(){
				            	var button = Ext.getCmp('save_button');
				            	if (Ext.getCmp('script_name').isValid()){
			            				
			            				var submit_params =  {
											pk: script_pk,
											name: Ext.getCmp('script_name').getValue(),
											type: Ext.getCmp('script_type').getValue(),
											params: Ext.encode(baseLayer.getJson())		            			
										};
									
									if (submit_params.type != script_type)
										Ext.Msg.show({
										   title:'Change Script Event?',
										   msg: 'You are changing the event to whom the script is associated. Note that only a script at once can be associated with a given event. Do you confirm the change?',
										   buttons: Ext.Msg.YESNOCANCEL,
										   fn: function(btn){
										   	if (btn == 'yes'){
												save_script(submit_params);	   		
										   		
										   	}
										   },
										   
										   icon: Ext.MessageBox.QUESTION
										});
									else
										save_script(submit_params);	   		
									
				            		
				            			            		
				            	}
				            	
					            	
					            
				            	
				            }
				        },{
				        	text: 'Delete',
				        	icon: '/files/images/icons/fam/delete.gif',
				        	handler: function(){
				        		if (script_pk)
					        		Ext.Msg.show({
					        			title:'Delete Script?',
									   msg: 'Are you sure you want to delete this script?',
									   buttons: Ext.Msg.YESNO,
									   fn: function(btn){
										   	if (btn == 'yes'){
										   		
												Ext.Ajax.request({
													url: '/delete_script/',
													params:{
														pk: script_pk
													},
													success: function(){
														window.opener.scripts_jsonstore.reload({
															callback: function(){
																window.close();
															}
														});
														
													
													}
												});
										   		
										   	}
									   },
								   
								   icon: Ext.MessageBox.QUESTION}
				        		
				        		);
				        		
				        	}
				        
				        }
				    ]
				})
				
				
			
			})
						
		
		
		]
	});
	
	
});

	