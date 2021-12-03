
const fs = require("fs");


function verifyValidModule(module)
{
    //All module must have priority
    if(!module.priority && module.priority !== 0)
        return null;

    
    //is syncronous module
    if(module.priority)
    {
        if(!module.before && !module.after)
            return null
            
        if(!module.before) module.before = (next) => {next()}
        if(!module.after) module.after = (next) => {next()}
    }
    //is a asyncrous module
    else
    {
        if(!module.plugin)
            return null
    }

    return module;
}

/**
 * Load all plugins from server folder and return it in order by priority high to low
 * @param {String} folder folder to search the plugins
 * @returns {Promise} A array contains all plugins objects
 */
 module.exports = function getAllPlugins(folder) {
    return fs.readdirSync(folder)
    .filter(a => !a.endsWith('test.js'))
    .map(a => `${folder}/${a}`)
    .map((file) => {
        try {
            let module = verifyValidModule(require(file));
            if(!module)
                console.error('Fail to load - ' + file)
            return module
        } catch (e) {
            console.error('Fail to load - ' + file)
            //all modules fail to load is ignored
            return null;
        }
    })
    
    //filters imports diff from null abd sort by priority
    //bigger priority will execute first
    .filter((a) => a).sort((a, b) => b.priority - a.priority);
}