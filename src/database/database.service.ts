import {
  Repository,
  DeepPartial,
  FindOptionsSelect,
  FindOptionsWhere,
} from 'typeorm';
import { CustomLogger } from 'src/logger/logger.service';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export abstract class BaseService<TEntity> {
  private readonly logger = new CustomLogger();

  constructor(protected readonly repository: Repository<TEntity>) {}

  getRepo(): Repository<TEntity> {
    return this.repository;
  }

  private handleDatabaseError(error: unknown, functionName: string): never {
    if (error instanceof Error) {
      this.logger.error(
        {
          message: error.message,
          filepath: __filename,
          functionname: functionName,
        },
        error.stack ?? '',
        BaseService.name,
      );
    }
    throw error;
  }

  async create(entity: DeepPartial<TEntity>): Promise<TEntity> {
    try {
      const createdEntity = this.repository.create(entity);
      return await this.repository.save(createdEntity);
    } catch (error: unknown) {
      return this.handleDatabaseError(error, this.create.name);
    }
  }

  async findOneById(
    id: string | number,
    select?: FindOptionsSelect<TEntity>,
  ): Promise<TEntity | null> {
    try {
      return await this.repository.findOne({
        where: { id } as unknown as FindOptionsWhere<TEntity>,
        select,
      });
    } catch (error: unknown) {
      return this.handleDatabaseError(error, this.findOneById.name);
    }
  }

  async update(
    id: string | number,
    updateData: QueryDeepPartialEntity<TEntity>,
  ): Promise<TEntity | null> {
    try {
      await this.repository.update(id, updateData);
      return this.findOneById(id);
    } catch (error: unknown) {
      return this.handleDatabaseError(error, this.update.name);
    }
  }
}
