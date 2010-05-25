#########################################################################
#
# NotreDAM, Copyright (C) 2009, Sardegna Ricerche.
# Email: labcontdigit@sardegnaricerche.it
# Web: www.notre-dam.org
#
# This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU General Public License for more details.
#
#########################################################################

from django.db import models
from django.utils import simplejson
from django.contrib.contenttypes import generic
from dam.upload.views import generate_tasks
from dam.variants.models import Variant
from dam.repository.models import Component
from dam.framework.dam_repository.models import Type
from django.db.models import Q
import logger

class ScriptException(Exception):
    pass
  
class MissingActionParameters(ScriptException):
    pass

class WrongInput(ScriptException):
    pass

class ActionError(ScriptException):
    pass

class MediaTypeNotSupported(ScriptException):
    pass

class PresetUnknown(ScriptException):
    pass

class ScriptDefault(models.Model):
    name = models.CharField(max_length= 50)
    description = models.CharField(max_length= 200)
    pipeline = models.TextField()

def _get_orig():
    return Variant.objects.get(name = 'original')

class ActionList(models.Model):
    actions = models.TextField()
    script = models.ForeignKey('Script')
    media_type = models.ForeignKey(Type)
    source_variant = models.ForeignKey(Variant, default = _get_orig)


class Script(models.Model):
    name = models.CharField(max_length= 50)
    description = models.CharField(max_length= 200)
#    pipeline = models.TextField()
    workspace = models.ForeignKey('workspace.DAMWorkspace')
    event = generic.GenericRelation('eventmanager.EventRegistration')
    state = models.ForeignKey('workflow.State',  null = True,  blank = True)
#    media_type = models.ManyToManyField(Type, through=ActionList)
    is_global = models.BooleanField(default = False)
    
#    def save(self, *args, **kwargs):
#        super(Script, self).save(*args, **kwargs)
#        pipeline = simplejson.loads(self.pipeline)
#        media_type = pipeline.keys()
#        
#        media_type = Type.objects.filter(name__in = media_type)
#        self.media_type.remove(*self.media_type.all())
#        self.media_type.add(*media_type)
#         
#    
    def __unicode__(self):
        return unicode(self.name)
    
    
    def execute(self, items):
#        pipeline = simplejson.loads(str(self.pipeline)) #cast needed, unicode keywords in Pipe.__init__ will not work
        
#        media_types = pipeline.keys()
                             
        actions_available = {}       
       
        classes = []
        classes.extend(BaseAction.__subclasses__())
        classes.extend(SaveAction.__subclasses__())
        
        for subclass in classes:
            if subclass != SaveAction:
                actions_available[subclass.__name__.lower()] = subclass
            
        actions_available[SendByMail.__name__.lower()] = SendByMail
        
        actions = {
            'image':[],
            'video':[],
            'audio':[],
            'doc':[]
            }
        
#        logger.debug('media_types %s'%media_types)
        
#        for media_type, info in pipeline.items():
        for action in self.actionlist_set.all():
            info = simplejson.loads(str(action.actions))
            media_type = action.media_type.name
            logger.debug('info %s '%info)            
            logger.debug('media_type %s'%media_type)
#            source_variant = info['source_variant']
            for action_dict in info['actions']:
                
                type = action_dict['type'].lower()
                params = action_dict['parameters']
                params['workspace'] = self.workspace
                params['media_type'] = media_type
                params['source_variant'] = action.source_variant
                logger.debug('action_dict %s'%action_dict)
                try:                    
                    action = actions_available[type](**params)                
                except Exception, ex:              
                    logger.exception(ex)                
                    raise ActionError('action %s does not exist'%type)
                actions[media_type].append(action)
  
        
        
        logger.debug('actions %s'%actions)
        for item in items:
            adapt_parameters = {}   
            media_type = item.type.name
                
            for action in actions[media_type]:
                if isinstance(action, SaveAs) or isinstance(action, SendByMail):
                    action.execute(item,adapt_parameters)
                else:
                    tmp_adapt_parameters = action.get_adapt_params()
                    logger.debug('tmp_adapt_parameters %s'%tmp_adapt_parameters)
                    if tmp_adapt_parameters:
                        adapt_parameters.update(tmp_adapt_parameters)
            
    class Meta:
        unique_together = ('name', 'workspace')
 
    
class BaseAction(object):
    
    media_type_supported = ['image', 'video', 'audio', 'doc']

    def __init__(self, media_type, source_variant, workspace, **params):   
        
#        if media_type not in self.media_type_supported:
#            raise MediaTypeNotSupported('media_type %s not supported by action %s'%(media_type, self.__class__.__name__))
        
        
        self.media_type = media_type
        logger.debug('self.media_type %s'%self.media_type)
        self.source_variant = source_variant
        self.workspace = workspace
        if params:
            self.parameters = params
        else:
            self.parameters = {}
            
    def get_adapt_params(self):
        return self.parameters
    
    @staticmethod
    def required_parameters(workspace):
        return []
    
    
    @staticmethod
    def get_values(workspace = None):
        pass

class SetRights(BaseAction):
    media_type_supported = ['image', 'video',  'doc', 'audio']
    
    @staticmethod
    def required_parameters(workspace):
        return  [{'name':'rights',  'type': 'string'}]
   
    def __init__(self, media_type, source_variant, workspace, rights):  
        super(SetRights, self).__init__(media_type, source_variant, workspace,  **{'rights':rights})
        

class SaveAction(BaseAction):
    media_type_supported = ['image', 'video',  'doc', 'audio']
    
    @staticmethod
    def required_parameters(workspace):
        
        return [ {'name':'output_format',  'type': 'string',  'values':{'image':['jpeg',  'gif'], 
                                    'video': ['flv'], 
                                    'audio': ['mp3'], 
                                    'doc': ['jpeg']
            }
        }]
    def __init__(self, media_type, source_variant, workspace, output_format):  
        super(SaveAction, self).__init__(media_type, source_variant, workspace)
        self.output_format = output_format
    
    
    def _get_output_media_type(self, adapt_parameters):
                
        if self.media_type == 'doc':
            output_media_type = 'image'
        elif  adapt_parameters.has_key('output_media_type'):
            output_media_type= adapt_parameters.pop('output_media_type')
        else:
            output_media_type = self.media_type
        
        return output_media_type
    
    def _same_adapted_resource(self, component):
        c = Component.objects.filter(source = component.source, parameters = component.parameters).exclude(pk = component.pk)
        if c.count() > 0:
            c = c[0]
            if c._id:
                return c._id
        return None
    
    def _generate_resource(self, component, adapt_parameters): 
        if adapt_parameters.has_key('rights'):
            rights = adapt_parameters.pop('rights')
        else:
            rights = None
        logger.debug('rights %s'%rights)
            
        logger.debug('self.output_variant %s'%self.output_variant)
        logger.debug('self.media_type %s'%self.media_type)
         
        if self.media_type == 'video' or self.media_type == 'audio':
            adapt_parameters['preset_name'] = self.output_format
        else:
            adapt_parameters['codec'] = self.output_format

        logger.debug('adapt_parameters %s'%adapt_parameters)    
         
#        component.save_rights_value(rights, self.workspace)
        logger.debug('self.source_variant %s'%self.source_variant)
        try:
#            source_variant = Variant.objects.get(name = self.source_variant)         
            source = self.source_variant.component_set.get(item = component.item, workspace = self.workspace)
        except Exception, ex:
#            in case edited does not exist
            logger.error(ex)
            source_variant = Variant.objects.get(name = 'original')
            source = source_variant.get_component(self.workspace, component.item)                 
        
        logger.debug('source.variant %s'%source.variant.name)
        
        if component.imported or( component.source and component._previous_source_id == source._id and  component.get_parameters() == adapt_parameters):
            logger.debug('component.source._id %s'%component.source._id)
            logger.debug('source._id %s'%source._id)
            logger.debug('component will not be regenerated, is imported or no mods in source or adapt_params')
            return
        
        component.set_parameters(adapt_parameters)
        component.set_source(source)
        
        
        component.save()
        component.save_rights_value(rights, self.workspace)
        
        same_resource = self._same_adapted_resource(component)
        if same_resource:
            component._id = same_resource
            component.save() 
        else:
            logger.debug('generate task')        
            generate_tasks(component)
        
    def execute(self, item, adapt_parameters):
        output_media_type = self._get_output_media_type(adapt_parameters)
        variant = Variant.objects.get(name = self.output_variant)                  
        component = variant.get_component(self.workspace,  item,  Type.objects.get(name = output_media_type))
        self._generate_resource(component, adapt_parameters)
    
    
class SaveAs(SaveAction):
    media_type_supported = ['image', 'video',  'doc', 'audio']
    
    @staticmethod
    def required_parameters(workspace):
        params = SaveAction.required_parameters(workspace)
        tmp = {}
        for media_type in Type.objects.all():
            tmp[media_type.name] = [variant. name for variant in Variant.objects.filter(Q(workspace = workspace) | Q(workspace__isnull = True), media_type = media_type)]
       
        params.append({'name':'output_variant',  'type': 'string',  'values':tmp})
        
        return params
    def __init__(self, media_type, source_variant, workspace, output_variant, output_format):  
        super(SaveAs, self).__init__(media_type, source_variant, workspace,output_format)
        self.output_variant = output_variant
    
    
        
        
class SendByMail(SaveAction):
    def __init__(self, media_type, source_variant, workspace, mail,  output_format):
        output_variant = 'mail'
        super(SendByMail, self).__init__(media_type, source_variant, workspace, output_format)
        self.mail = mail
        self.output_variant = 'mail'
    
    def execute(self, item, adapt_parameters):  
        adapt_parameters['mail'] = self.mail
        super(SendByMail, self).execute(item, adapt_parameters)

class Resize(BaseAction): 
    media_type_supported = ['image', 'video',  'doc']
    @staticmethod
    def required_parameters(workspace):
        return [{'name':'max_height',  'type':'number'},{'name':'max_width','type':'number'}]
   
    def __init__(self, media_type, source_variant, workspace,  max_height, max_width):
        super(Resize, self).__init__(media_type, source_variant, workspace)
        if media_type == 'video':
            self.parameters['video_height'] = max_height
            self.parameters['video_width'] = max_width
        else:
            self.parameters['max_height'] = max_height
            self.parameters['max_width'] = max_width
                

class Crop(BaseAction): 
    media_type_supported = ['image',]
    @staticmethod
    def required_parameters(workspace):
        return [{ 'name': 'upperleft_x',  'type': 'number'}, { 'name': 'upperleft_y',  'type': 'number'}, { 'name': 'lowerright_x',  'type': 'number'}, { 'name': 'lowerright_y',  'type': 'number'}]
    
    def __init__(self, media_type, source_variant, workspace,  upperleft_x, upperleft_y, lowerright_x, lowerright_y):
        params = {'upperleft_x':upperleft_x, 'upperleft_y':upperleft_y, 'lowerright_x':lowerright_x, 'lowerright_y':lowerright_y }
        
        super(Crop, self).__init__(media_type, source_variant, workspace, **params)
     
class Watermark(BaseAction): 
    media_type_supported = ['image', 'video']
   
    @staticmethod
    def required_parameters(workspace):
        return [{ 'name': 'filename',  'type': 'string'}, { 'name': 'pos_x_percent','type': 'number'}, { 'name': 'pos_y_percent',  'type': 'number'}, { 'name': 'alpha',  'type': 'number'}]
    
    def __init__(self, media_type, source_variant, workspace, filename, pos_x = None, pos_y = None, pos_x_percent = None, pos_y_percent = None, alpha = None):
        
        super(Watermark,  self).__init__(media_type, source_variant, workspace)
        self.parameters['watermark_filename'] = filename
        
         
        
        if self.media_type == 'image':
            if not (pos_x and pos_y):
                raise MissingActionParameters('pos_x or pos_y parameter is missing: they are required')
            
            self.parameters['alpha'] = alpha
            self.parameters['pos_x'] = pos_x
            self.parameters['pos_y'] = pos_y
            
        else:
            if not ((pos_x and pos_y) or (pos_x_percent and pos_y_percent)):
                raise MissingActionParameters('no coordinates for watermark are passed (pos_x, pos_y or pos_x_percent, pos_y_percent): they are required')
            
            if (pos_x and pos_y):
                self.parameters['watermark_top'] = pos_x
                self.parameters['watermark_left'] = pos_y
            else:
                self.parameters['watermark_top_percent'] = pos_x_percent
                self.parameters['watermark_left_percent'] = pos_y_percent
                
                
            
        
#        TODO: watermark corner
        

preset = {'video':
                   {'matroska_mpeg4_aac': 'mpeg4',
                   'mp4_h264_aaclow': 'mpeg4',
                   'flv': 'flv',
                   'avi': 'avi',
                   'flv_h264_aac': 'flv',
                   'theora': 'ogg'}
     
}

        
class VideoEncode(BaseAction):
    """default bitrate in kb""" 
    media_type_supported = ['video']
    @staticmethod
    def required_parameters(workspace):
        return [{ 'name': 'bitrate','type': 'number'},  { 'name': 'framerate', 'type': 'number'}]
    
    def __init__(self, media_type, source_variant, workspace, bitrate, framerate):
        params = {'bitrate':bitrate,  'framerate': framerate}
        super(VideoEncode, self).__init__(media_type, source_variant, workspace, **params)
        
       
        if self.parameters.has_key('bitrate'):
#            if self.parameters['output_format'] in ['flv', 'avi', 'mpegts']:
#                self.parameters['video_bitrate'] = int(self.parameters.pop('bitrate')*1000)
#            else:
#                 self.parameters['video_bitrate'] = int(self.parameters.pop('bitrate'))
            self.parameters['video_bitrate'] = int(self.parameters.pop('bitrate'))       
        
        if self.parameters.has_key('framerate'): 
            self.parameters['video_framerate'] = self.parameters.pop('framerate')
                
class AudioEncode(BaseAction):
    """default bitrate in kb"""
    media_type_supported = ['video', 'audio']
    
    @staticmethod
    def required_parameters(workspace):
        return [{ 'name': 'bitrate','type': 'number'},  { 'name': 'rate', 'type': 'number'}]
    def __init__(self, media_type, source_variant, workspace, rate, bitrate):
        super(AudioEncode, self).__init__(media_type, source_variant, workspace)
        

        self.parameters['audio_bitrate'] = int(bitrate)            
        self.parameters['audio_rate'] = int(rate)
                

class ExtractVideoThumbnail(BaseAction):
    media_type_supported = ['video']
    @staticmethod
    def required_parameters(workspace):
        return [{ 'name': 'max_height','type': 'number'},  { 'name': 'max_width', 'type': 'number'}]
    
    def __init__(self, media_type, source_variant, workspace, max_height,  max_width):
        params = {'max_height': max_height,  'max_width':max_width,  'output_media_type': 'image'}
        super(ExtractVideoThumbnail, self).__init__(media_type, source_variant, workspace, **params)
    

