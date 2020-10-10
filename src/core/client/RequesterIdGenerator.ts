export class RequesterIdGenerator {
    private nextId = 1;

    public generateId(): string {
        return String(this.nextId++);
    }

    public reset() {
        this.nextId = 1;
    }
}
