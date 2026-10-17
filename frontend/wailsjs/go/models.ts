export namespace main {
	
	export class InstalledMod {
	    id: string;
	    name: string;
	    game: string;
	    version?: string;
	    loader?: string;
	    minecraft?: string;
	    instanceName?: string;
	    path?: string;
	    installedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new InstalledMod(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.game = source["game"];
	        this.version = source["version"];
	        this.loader = source["loader"];
	        this.minecraft = source["minecraft"];
	        this.instanceName = source["instanceName"];
	        this.path = source["path"];
	        this.installedAt = source["installedAt"];
	    }
	}
	export class UpdateInfo {
	    available: boolean;
	    current: string;
	    latest: string;
	    url: string;
	    notes: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.available = source["available"];
	        this.current = source["current"];
	        this.latest = source["latest"];
	        this.url = source["url"];
	        this.notes = source["notes"];
	    }
	}

}

